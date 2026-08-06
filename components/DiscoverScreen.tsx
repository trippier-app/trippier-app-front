'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import AccountButton from '@/components/AccountButton';
import { useCircleTransition } from '@/components/CircleTransition';
import Chip from '@/components/Chip';
import { useT } from '@/components/I18nProvider';
import { useMaps } from '@/components/MapsProvider';
import { cn } from '@/lib/cn';
import MapView, {
  MapCorners,
  type MapCamera,
  type MapMarker,
  type MapViewHandle,
} from '@/components/MapView';
import PoiDetailScreen from '@/components/PoiDetailScreen';
import PoiRow, { PoiRowSkeleton } from '@/components/PoiRow';
import SourceChips from '@/components/SourceChips';
import SearchBar from '@/components/SearchBar';
import { ArrowLeft, MapPin, Search, X } from '@/components/icons';
import {
  DISCOVER_CHIPS,
  DISCOVER_DEFAULT_CENTER,
  DISCOVER_DEFAULT_ZOOM,
  DISCOVER_USER_ZOOM,
  formatPoiMeta,
  isInBounds,
  isZoomedTooFarOut,
  radiusFromBounds,
  type MapBounds,
} from '@/lib/discover';
import { poiKey, searchPois, streamPois, type EnrichedPoi } from '@/lib/pois';

type SnapIndex = 0 | 1 | 2 | 3;

/** Vertical room the floating tab bar needs at the bottom of the stage. */
const TABBAR_RESERVED = 88;
const FETCH_LIMIT = 30;
/**
 * Idle window the camera has to settle before hitting the API — at ~500 ms a
 * casual pan or zoom no longer fires a request on every frame, while still
 * feeling responsive once the user stops moving the map.
 */
const REFETCH_MS = 500;
/**
 * Escalating radii for the searches re-resolving a shared `?poi=` deep link.
 * The API has no by-id lookup, so the shared coordinates are searched and
 * the id picked out of the results. Providers answer partially under load,
 * hence the retry at a wider radius before giving up on enrichment.
 */
const DEEP_LINK_RADII_M = [1000, 3000];
/** Attempts per radius, so a partial merge gets a second, fuller chance. */
const DEEP_LINK_ATTEMPTS = 2;
/** Coordinate slack, in degrees (~85 m), for the proximity fallback. */
const DEEP_LINK_MATCH_DEG = 0.00077;
/** Height of the floating search bar, plus the gap under it. */
const SEARCH_BAR_H = 52;
const FRAME = 12;
/**
 * Side offset of the floating search bar. The bar carries a 42px leading
 * slot flush against its left cap (see {@link SearchBar}), and the POI
 * detail screen's back button copies that slot's exact footprint
 * (x = SEARCH_X, y = SEARCH_TOP + 5), so the two back arrows superpose
 * perfectly across screens.
 */
const SEARCH_X = 20;
/** Top offset of the floating search bar; see {@link SEARCH_X}. */
const SEARCH_TOP = 19;
/** Release below this fraction of the first snap collapses the drawer. */
const CLOSE_RATIO = 0.55;
/** Fraction of the stage width the results side panel takes on md+. */
const PANEL_FRACTION = 1 / 3;
/**
 * Viewport width at which the results move from the bottom drawer to the
 * side panel. Matches Tailwind's `md:` breakpoint, which gates the same
 * switch in the markup — if one moves, the other must follow.
 */
const WIDE_MQ = '(min-width: 768px)';
const DRAWER_EASE = [0.4, 0, 0.2, 1] as const;

/**
 * Query string deep-linking to a place's detail page. The coordinates ride
 * along because the API cannot look a POI up by id — the receiving end
 * re-finds it by searching around them ({@link DEEP_LINK_RADII_M}).
 *
 * @param poi - The place to link to.
 * @returns A `?poi=…` query string for the current pathname.
 */
interface DeepLink {
  id: string;
  lat: number;
  lng: number;
}

/**
 * Reads the shared-place parameters off the URL.
 *
 * @param params - The current query string.
 * @returns The deep link, or null when the URL carries none.
 */
function readDeepLink(params: URLSearchParams): DeepLink | null {
  const id = params.get('poi');
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  if (!id || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { id, lat, lng };
}

/**
 * Best readable name an identifier can offer on its own.
 *
 * A stable identity spells the place out in one of its two forms
 * (`geo:<name>@<lat>,<lng>`) but not the other (`wd:Q243`), and a legacy
 * provider id keeps it in its last segment. Nothing readable is better than
 * a Wikidata number: the skeleton covers the gap until the place resolves.
 *
 * @param id - The identifier carried by the link.
 * @returns A display name, or an empty string when the id holds none.
 */
function nameFromId(id: string): string {
  if (id.startsWith('wd:')) {
    return '';
  }
  if (id.startsWith('geo:')) {
    return id.slice(4).split('@')[0];
  }
  return id.split(':').pop() ?? '';
}

/**
 * Minimal place standing in for a shared link while it resolves, and the
 * fallback when it cannot be resolved at all.
 *
 * @param link - The shared place parameters.
 * @returns A place carrying only what the link itself states.
 */
function placeFromLink({ id, lat, lng }: DeepLink): EnrichedPoi {
  return {
    id,
    stable_id: id,
    name: nameFromId(id),
    type: '',
    score: 0,
    distance: 0,
    coords: { lat, lng, approximate: false },
    sources: [],
  };
}

function detailQueryFor(poi: EnrichedPoi): string {
  const params = new URLSearchParams({ poi: poiKey(poi) });
  if (poi.coords) {
    params.set('lat', String(poi.coords.lat));
    params.set('lng', String(poi.coords.lng));
  }
  return `?${params}`;
}

/**
 * Discover — the app's landing screen: a full-bleed map, a floating search
 * bar, and a draggable results drawer. On tablet/desktop viewports
 * ({@link WIDE_MQ}) the drawer gives way to a fixed results panel docked on
 * the left, with the search bar at its top. Tapping a row's card pushes the
 * full-screen {@link PoiDetailScreen} overlay for that place, mirrored into
 * the URL as `?poi=…` so the page can be shared and reopened directly.
 *
 * The map is never resized by the drawer: the drawer is an overlay, so
 * MapLibre's camera and tile cache are undisturbed as the sheet moves.
 *
 * POI data flow mirrors the mobile app:
 *
 * 1. The camera opens on the whole world and flies to the user once geolocation
 *    resolves; nothing is fetched until a viewport is worth querying.
 * 2. On every settled viewport (debounced to {@link REFETCH_MS}), re-fetch
 *    around the new center using {@link radiusFromBounds}.
 * 3. Both pins and rows are clipped to {@link isInBounds}, so a stale fetch
 *    never paints places outside the visible viewport.
 *
 * @returns The Discover screen.
 */
interface DiscoverScreenProps {
  /** MapTiler style URL resolved server-side; null when the key is unset. */
  mapStyleUrl: string | null;
}

export default function DiscoverScreen({ mapStyleUrl }: DiscoverScreenProps) {
  const t = useT();
  const { mapsHolding } = useMaps();
  const searchParams = useSearchParams();
  const [deepLink] = useState(() => readDeepLink(new URLSearchParams(searchParams.toString())));
  // A fade-mode change is a move between two map screens: the panel dips out
  // and the camera pulls back to the default view, so the arriving screen —
  // which opens on that same view — takes over without a visible jump.
  const { phase: transitionPhase, mode: transitionMode } = useCircleTransition();
  const leaving = transitionPhase === 'covering' && transitionMode === 'fade';
  useEffect(() => {
    if (leaving) {
      mapRef.current?.flyTo(DISCOVER_DEFAULT_CENTER.lat, DISCOVER_DEFAULT_CENTER.lng, {
        zoom: DISCOVER_DEFAULT_ZOOM,
      });
    }
  }, [leaving]);

  const stageRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapViewHandle>(null);
  const refetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflight = useRef<AbortController | null>(null);
  const userMoved = useRef(false);
  const flewToUser = useRef(false);
  const dragStartHeight = useRef(0);
  const suppressNextRefetch = useRef(false);
  /**
   * Camera as it stood before the first programmatic fly of a drawer session,
   * so closing the drawer can glide the map back where the user left it.
   */
  const cameraBeforeFocus = useRef<MapCamera | null>(null);
  const lastViewport = useRef<{
    bounds: MapBounds;
    center: { lat: number; lng: number };
  } | null>(null);

  const [stageH, setStageH] = useState(0);
  const [snap, setSnap] = useState<SnapIndex>(0);
  const [chipId, setChipId] = useState<(typeof DISCOVER_CHIPS)[number]['id']>('for-you');
  const [pois, setPois] = useState<EnrichedPoi[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tooFarOut, setTooFarOut] = useState(false);
  const [partialResults, setPartialResults] = useState(false);
  const [pendingSources, setPendingSources] = useState<string[]>([]);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [detailPoi, setDetailPoi] = useState<EnrichedPoi | null>(() =>
    deepLink ? placeFromLink(deepLink) : null,
  );
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [detailPending, setDetailPending] = useState(() => deepLink !== null);

  const drawerH = useMotionValue(0);
  // The cutout stops one frame-width short of the drawer, so the white band
  // above the sheet matches the one under the search bar.
  const cutoutBottom = useTransform(drawerH, height => height + FRAME);

  const activeChip = useMemo(
    () => DISCOVER_CHIPS.find(chip => chip.id === chipId) ?? DISCOVER_CHIPS[0],
    [chipId],
  );

  // Top edge of the map cutout: just below the floating search bar.
  const cutoutTop = SEARCH_TOP + SEARCH_BAR_H + FRAME;
  // The drawer grows into whatever the map leaves below the search bar.
  const usefulH = Math.max(0, stageH - cutoutTop);
  const snapHeights = useMemo<Record<SnapIndex, number>>(
    () => ({ 0: 0, 1: usefulH / 3, 2: (usefulH * 2) / 3, 3: usefulH }),
    [usefulH],
  );

  const open = snap > 0;
  const isFull = snap === 3;

  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(WIDE_MQ);
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const mapInset = useMemo(
    () => (wide ? undefined : { top: cutoutTop, bottom: snapHeights[snap] }),
    [wide, snap, snapHeights, cutoutTop],
  );

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => setStageH(entry.contentRect.height));
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  // Snap state is the source of truth; the pan gesture writes drawerH
  // imperatively and commits a snap on release, which lands us back here.
  useEffect(() => {
    const controls = animate(drawerH, snapHeights[snap], { duration: 0.35, ease: DRAWER_EASE });
    return () => controls.stop();
  }, [snap, snapHeights, drawerH]);

  /**
   * Streams the POI search through the Next proxy.
   *
   * Each frame is the whole result as it then stood, so the list is replaced
   * rather than merged here — the providers revise each other, and reconciling
   * that client-side would mean duplicating the server's dedup rules. Older
   * streams are aborted before a new one starts, so a slow earlier search
   * cannot paint over a fresher one.
   */
  const loadPois = useCallback(
    async (lat: number, lng: number, radius: number, types: (typeof activeChip)['types']) => {
      inflight.current?.abort();
      const controller = new AbortController();
      inflight.current = controller;

      setLoading(true);
      setErrorMessage(null);
      setFailedSources([]);
      try {
        await streamPois(
          { lat, lng, radius, limit: FETCH_LIMIT, types },
          frame => {
            setPois(frame.results);
            setPartialResults(frame.partial);
            setPendingSources(frame.pending);
            setFailedSources(frame.failed);
            // Results are on screen from the first frame; only the wait for
            // the very first one is a loading state.
            setLoading(false);
          },
          controller.signal,
        );
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : t('results_error'));
      } finally {
        if (inflight.current === controller) {
          inflight.current = null;
        }
        if (!controller.signal.aborted) {
          setLoading(false);
          setPartialResults(false);
          // Nothing is awaited once the stream closes, but the sources that
          // gave up stay listed: they are why the list is short.
          setPendingSources([]);
        }
      }
    },
    [t],
  );

  const scheduleRefetch = useCallback(
    (next: MapBounds, center: { lat: number; lng: number }) => {
      if (refetchTimer.current) {
        clearTimeout(refetchTimer.current);
      }
      const farOut = isZoomedTooFarOut(next);
      setTooFarOut(farOut);
      if (farOut) {
        setPois([]);
        setLoading(false);
        setPendingSources([]);
        setFailedSources([]);
        return;
      }
      refetchTimer.current = setTimeout(() => {
        loadPois(center.lat, center.lng, radiusFromBounds(next), activeChip.types);
      }, REFETCH_MS);
    },
    [loadPois, activeChip],
  );

  const handleBoundsChange = useCallback(
    (next: MapBounds, center: { lat: number; lng: number }) => {
      setMapReady(true);
      // A viewport change we caused ourselves by flying to a place the user
      // just picked must leave the results alone: re-querying, or re-clipping
      // rows and pins to the zoomed-in bounds, would reshuffle the list right
      // under them.
      if (suppressNextRefetch.current) {
        suppressNextRefetch.current = false;
        return;
      }
      setBounds(next);
      lastViewport.current = { bounds: next, center };
      scheduleRefetch(next, center);
    },
    [scheduleRefetch],
  );

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }
    let cancelled = false;
    navigator.geolocation.getCurrentPosition(
      position => {
        if (!cancelled) {
          setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        }
      },
      () => {},
      { timeout: 10000, maximumAge: 300000 },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // The position and the map become available in either order, so the flight
  // waits for both — and is skipped once the user has taken the camera over.
  useEffect(() => {
    if (!userCoords || !mapReady || userMoved.current || flewToUser.current) {
      return;
    }
    flewToUser.current = true;
    mapRef.current?.flyTo(userCoords.lat, userCoords.lng, { zoom: DISCOVER_USER_ZOOM });
  }, [userCoords, mapReady]);

  // Changing the filter has to re-query: the API does the filtering, so a new
  // chip means a new request around the viewport we are already looking at.
  useEffect(() => {
    const viewport = lastViewport.current;
    if (!viewport) {
      return;
    }
    scheduleRefetch(viewport.bounds, viewport.center);
  }, [activeChip, scheduleRefetch]);

  useEffect(
    () => () => {
      if (refetchTimer.current) {
        clearTimeout(refetchTimer.current);
      }
      inflight.current?.abort();
    },
    [],
  );

  const visiblePois = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return pois.filter(poi => {
      if (needle && !poi.name.toLowerCase().includes(needle)) {
        return false;
      }
      return !bounds || !poi.coords || isInBounds(poi.coords.lat, poi.coords.lng, bounds);
    });
  }, [pois, bounds, query]);

  /**
   * Selects a place, settles the drawer at `targetSnap` and flies to it.
   *
   * The map is full-bleed but the drawer hides its lower part, so centring on
   * the canvas would drop the place behind the sheet. The visible strip runs
   * from {@link cutoutTop} down to the drawer's top edge, and its middle sits
   * half that difference above the canvas centre — which is exactly the
   * offset handed to the camera.
   *
   * The camera in place before the first fly of a drawer session is captured
   * once, so {@link closeDrawer} can put the map back where the user left it
   * even after hopping between several places.
   */
  const focusOnPoi = useCallback(
    (poi: EnrichedPoi, targetSnap: Exclude<SnapIndex, 0>) => {
      setSelectedId(poiKey(poi));
      setSnap(targetSnap);
      if (!poi.coords) {
        return;
      }
      cameraBeforeFocus.current ??= mapRef.current?.getCamera() ?? null;
      suppressNextRefetch.current = true;
      mapRef.current?.flyTo(poi.coords.lat, poi.coords.lng, {
        zoom: 17,
        offsetY: wide ? 0 : (cutoutTop - snapHeights[targetSnap] - FRAME) / 2,
      });
    },
    [cutoutTop, snapHeights, wide],
  );

  /**
   * Collapses the drawer and, when focusing a place had moved the camera,
   * flies back to the viewport the user was exploring before the search. The
   * settled move then re-runs the normal bounds flow, so rows and pins stay
   * in sync with what the map shows.
   */
  const closeDrawer = useCallback(() => {
    setSnap(0);
    const camera = cameraBeforeFocus.current;
    if (camera) {
      cameraBeforeFocus.current = null;
      mapRef.current?.flyTo(camera.lat, camera.lng, { zoom: camera.zoom });
    }
  }, []);

  /**
   * Wide-layout back affordance in the panel's search bar: drops the current
   * selection, folds any open detail and glides the camera back to the
   * viewport the user was exploring before zooming onto a place. The settled
   * move re-runs the normal bounds flow, so the list follows the dezoom.
   */
  const resetFocus = useCallback(() => {
    setDetailPoi(null);
    setSelectedId(undefined);
    if (new URLSearchParams(window.location.search).has('poi')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
    const camera = cameraBeforeFocus.current;
    if (camera) {
      cameraBeforeFocus.current = null;
      mapRef.current?.flyTo(camera.lat, camera.lng, { zoom: camera.zoom });
    }
  }, []);

  /** Opens a place's detail overlay and mirrors it into the URL. */
  const openDetail = useCallback((poi: EnrichedPoi) => {
    setSelectedId(poiKey(poi));
    setDetailPoi(poi);
    window.history.pushState(null, '', detailQueryFor(poi));
  }, []);

  /** Closes the detail overlay and strips the deep link from the URL. */
  const closeDetail = useCallback(() => {
    setDetailPoi(null);
    setDetailPending(false);
    if (new URLSearchParams(window.location.search).has('poi')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  // Browser back/forward keeps the overlay in sync with the URL: navigating
  // back from `?poi=…` closes the detail, forward reopens it when the place
  // is still in the loaded results.
  useEffect(() => {
    const handlePopState = () => {
      const id = new URLSearchParams(window.location.search).get('poi');
      if (!id) {
        setDetailPoi(null);
        return;
      }
      const poi = pois.find(candidate => poiKey(candidate) === id || candidate.id === id);
      if (poi) {
        setSelectedId(poiKey(poi));
        setDetailPoi(poi);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [pois]);

  // Shared `?poi=` deep link: the detail is already open in a pending state
  // (seeded from the URL at render time), and only once the place resolves
  // does the camera move — a link should not start by flying the map around
  // an empty screen.
  //
  // Ids are not stable: which provider wins the merge depends on who answered
  // in time, so a shared id can vanish from a later response. Resolution
  // therefore falls back from id to name to plain proximity, and a partial
  // merge is retried because it is exactly what strips a place of its
  // enrichment — the same POI comes back with one source instead of three.
  useEffect(() => {
    if (!deepLink) {
      return;
    }
    const { id, lat, lng } = deepLink;
    const name = nameFromId(id).toLowerCase();
    // Merged records sit next to bare twins (a monument and the OSM node of
    // its carousel share coordinates), so the name and proximity tiers pick
    // the richest candidate — most sources, then a description — with the
    // distance only breaking ties.
    const nearness = (candidate: EnrichedPoi): number =>
      candidate.coords
        ? Math.hypot(candidate.coords.lat - lat, candidate.coords.lng - lng)
        : Number.POSITIVE_INFINITY;
    const richness = (candidate: EnrichedPoi): number =>
      candidate.sources.length + (candidate.description ? 1 : 0);
    const richest = (candidates: EnrichedPoi[]): EnrichedPoi | undefined =>
      [...candidates].sort((a, b) => richness(b) - richness(a) || nearness(a) - nearness(b))[0];
    const pick = (candidates: EnrichedPoi[]): EnrichedPoi | undefined =>
      candidates.find(candidate => poiKey(candidate) === id) ??
      candidates.find(candidate => candidate.id === id) ??
      (name ? richest(candidates.filter(c => c.name.toLowerCase() === name)) : undefined) ??
      richest(candidates.filter(candidate => nearness(candidate) < DEEP_LINK_MATCH_DEG));

    let cancelled = false;
    (async () => {
      // A partial answer often carries only a bare twin of the place (the
      // provider holding the rich record timed out), so it never settles the
      // search: the richest candidate seen so far is kept while wider or
      // repeated attempts run, and only a complete answer with a match ends
      // them.
      let best: EnrichedPoi | undefined;
      let settled = false;
      for (const radius of DEEP_LINK_RADII_M) {
        for (let attempt = 0; attempt < DEEP_LINK_ATTEMPTS; attempt++) {
          let result;
          try {
            result = await searchPois({ lat, lng, radius, limit: FETCH_LIMIT });
          } catch {
            continue;
          }
          if (cancelled) {
            return;
          }
          const match = pick(result.results);
          if (match && (!best || richness(match) > richness(best))) {
            best = match;
          }
          if (!result.partial) {
            settled = match !== undefined;
            break;
          }
        }
        if (settled) {
          break;
        }
      }
      if (cancelled) {
        return;
      }
      if (best) {
        setSelectedId(poiKey(best));
        setDetailPoi(best);
      } else {
        setSelectedId(id);
      }
      setDetailPending(false);
      mapRef.current?.flyTo(lat, lng, { zoom: 16 });
    })();
    return () => {
      cancelled = true;
    };
  }, [deepLink]);

  /**
   * Brings a place's row into view in whichever results list is visible —
   * the drawer on mobile, the side panel on wide screens — so a selection
   * made on the map is visibly mirrored by the list. Deferred a frame so the
   * drawer's snap change has been applied before the scroll resolves; the
   * hidden list's scroll is a no-op.
   */
  const scrollRowIntoView = useCallback((poiId: string) => {
    requestAnimationFrame(() => {
      stageRef.current
        ?.querySelectorAll(`[data-poi-id="${CSS.escape(poiId)}"]`)
        .forEach(row => row.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    });
  }, []);

  const markers = useMemo<MapMarker[]>(
    () =>
      visiblePois
        .filter(poi => poi.coords && !poi.coords.approximate)
        .map(poi => ({
          id: poiKey(poi),
          lat: poi.coords!.lat,
          lng: poi.coords!.lng,
          type: poi.type,
          onSelect: () => {
            focusOnPoi(poi, 2);
            scrollRowIntoView(poiKey(poi));
          },
        })),
    [visiblePois, focusOnPoi, scrollRowIntoView],
  );

  const headerMeta = tooFarOut
    ? t('results_zoom_in')
    : (errorMessage ??
      (loading
        ? t('results_looking')
        : t('results_count', { count: visiblePois.length }) +
          (partialResults ? ` · ${t('results_sources_slow')}` : '')));

  /** Picks the snap whose height is closest to where the drag was released. */
  const commitSnap = useCallback(
    (velocity: number) => {
      const current = drawerH.get() + velocity * 0.2;
      if (current < snapHeights[1] * CLOSE_RATIO) {
        closeDrawer();
        return;
      }
      const candidates: Exclude<SnapIndex, 0>[] = [1, 2, 3];
      const best = candidates.reduce((acc, index) =>
        Math.abs(snapHeights[index] - current) < Math.abs(snapHeights[acc] - current) ? index : acc,
      );
      setSnap(best);
    },
    [drawerH, snapHeights, closeDrawer],
  );

  // Results content shared by the mobile drawer and the wide-screen side
  // panel — only the container differs between the two layouts.
  const resultsHeader = (
    <header className="flex items-start justify-between gap-3 px-5 pb-2">
      <div className="min-w-0">
        <h2 className="text-ink text-[22px] font-bold tracking-tight">
          {t('results_title')}
          <span className="bg-emerald ml-1 inline-block size-1.5 rounded-pill align-middle" />
        </h2>
        <p className="text-mute mt-1 truncate font-mono text-[12.5px]">{headerMeta}</p>
      </div>
    </header>
  );

  const resultsChips = (
    <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2.5">
      {DISCOVER_CHIPS.map(chip => (
        <Chip
          key={chip.id}
          label={t(chip.labelKey)}
          active={chipId === chip.id}
          onClick={() => setChipId(chip.id)}
        />
      ))}
    </div>
  );

  const sourceChips = <SourceChips pending={pendingSources} failed={failedSources} />;

  const resultsRows = (
    <>
      {visiblePois.map(poi => (
        <div key={poiKey(poi)} data-poi-id={poiKey(poi)}>
          <PoiRow
            name={poi.name}
            meta={formatPoiMeta(poi, t(activeChip.labelKey), t)}
            type={poi.type}
            distanceMeters={poi.distance}
            selected={poiKey(poi) === selectedId}
            savedCount={mapsHolding(poiKey(poi)).length}
            onSelect={() => openDetail(poi)}
            onZoom={
              poi.coords
                ? () => {
                    // On wide layouts the list stays interactive while a
                    // detail covers the map box — zooming to a place means
                    // showing the map, so any open detail folds first.
                    closeDetail();
                    focusOnPoi(poi, snap === 0 ? 1 : snap);
                  }
                : undefined
            }
          />
        </div>
      ))}
      {loading
        ? Array.from({ length: visiblePois.length === 0 ? 6 : 3 }, (_, index) => (
            <PoiRowSkeleton key={`skeleton-${index}`} />
          ))
        : null}
      {!loading && visiblePois.length === 0 ? (
        <p className="text-mute px-6 py-8 text-center font-mono text-[13px]">
          {tooFarOut
            ? t('results_empty_far')
            : partialResults
              ? t('results_empty_slow')
              : t('results_empty')}
        </p>
      ) : null}
    </>
  );

  // Geometry of the wide-layout map box, shared by the box itself and the
  // sibling carrying its drop shadow (see {@link MapCorners}).
  const mapBox = wide
    ? {
        top: FRAME,
        bottom: FRAME,
        right: FRAME,
        left: `calc(${PANEL_FRACTION * 100}% + ${2 * FRAME}px)`,
      }
    : undefined;

  return (
    <div ref={stageRef} className="relative h-full w-full overflow-hidden">
      <div className={cn('absolute', wide ? 'overflow-hidden' : 'inset-0')} style={mapBox}>
        <MapView
          ref={mapRef}
          styleUrl={mapStyleUrl}
          inset={mapInset}
          center={DISCOVER_DEFAULT_CENTER}
          zoom={DISCOVER_DEFAULT_ZOOM}
          markers={markers}
          selectedId={selectedId}
          onBoundsChange={handleBoundsChange}
          onUserMove={() => {
            userMoved.current = true;
          }}
        />
        {wide ? <MapCorners /> : null}
      </div>

      {wide ? (
        <div
          aria-hidden
          className="shadow-e1 pointer-events-none absolute rounded-xl"
          style={mapBox}
        />
      ) : null}

      {/*
        The frame that turns the map into a rounded cutout once the drawer is
        open. Rather than insetting the map — which would resize the canvas on
        every drag frame and move the viewport — this is an overlay whose huge
        spread shadow paints everything *outside* its rounded box, welding the
        top strip, the side gutters and the drawer into one continuous surface.
        Its bottom edge rides `drawerH`, so it always meets the drawer's top.
       */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute z-10 rounded-xl md:hidden"
        style={{
          top: cutoutTop,
          left: FRAME,
          right: FRAME,
          bottom: cutoutBottom,
          boxShadow: '0 0 0 9999px var(--m-surface)',
        }}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: 0.22, ease: DRAWER_EASE }}
      />

      <div
        className="pointer-events-none absolute z-20 md:hidden"
        style={{ top: SEARCH_TOP, left: SEARCH_X, right: SEARCH_X }}>
        <SearchBar
          className="pointer-events-auto"
          value={query}
          onValueChange={value => {
            setQuery(value);
            if (value) {
              setSnap(current => (current === 0 ? 1 : current));
            }
          }}
          onFocus={() => setSnap(current => (current === 0 ? 1 : current))}
          leading={
            open ? (
              <button
                type="button"
                aria-label={t('search_back_map')}
                onClick={closeDrawer}
                className="flex size-full items-center justify-center">
                <ArrowLeft size={20} />
              </button>
            ) : (
              <Search size={19} />
            )
          }
          trailing={
            <>
              {isFull ? (
                <button
                  type="button"
                  aria-label={t('search_close_results')}
                  onClick={closeDrawer}
                  className="bg-emerald text-on-emerald flex size-8 items-center justify-center rounded-pill">
                  <X size={14} />
                </button>
              ) : null}
              <AccountButton />
            </>
          }
        />
      </div>

      {!open ? (
        <button
          type="button"
          onClick={() => setSnap(2)}
          style={{ bottom: TABBAR_RESERVED + 14 }}
          className="bg-surface shadow-e2 text-emerald-deep absolute left-1/2 z-20 flex max-w-[80%] -translate-x-1/2 items-center gap-1.5 rounded-pill px-3.5 py-2 text-[12.5px] font-semibold tracking-tight md:hidden">
          <MapPin size={14} />
          <span className="truncate">{headerMeta}</span>
        </button>
      ) : null}

      <motion.section
        aria-label={t('results_label')}
        style={{ height: drawerH }}
        className="bg-surface shadow-e3 absolute inset-x-3 bottom-0 z-20 flex flex-col overflow-hidden rounded-t-xl md:hidden"
        // The drawer is inert when collapsed so the map keeps every gesture.
        inert={!open}>
        <motion.div
          onPanStart={() => {
            dragStartHeight.current = drawerH.get();
          }}
          onPan={(_, info) => {
            drawerH.set(
              Math.max(0, Math.min(snapHeights[3], dragStartHeight.current - info.offset.y)),
            );
          }}
          onPanEnd={(_, info) => commitSnap(-info.velocity.y)}
          className="flex cursor-grab touch-none justify-center pt-2.5 pb-2 active:cursor-grabbing">
          <span className="bg-mute2 h-1.5 w-10 rounded-pill" />
        </motion.div>

        {resultsHeader}

        {resultsChips}

        {sourceChips}

        <div
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2"
          style={{ paddingBottom: TABBAR_RESERVED }}>
          {resultsRows}
        </div>
      </motion.section>

      {/*
        Tablet / desktop (md+): the results live in a fixed panel on the left
        instead of the bottom drawer — the drawer, its pill and the mobile
        cutout are all mobile-only. The map is a sibling box rather than a
        full-bleed canvas, so its centre and bounds are the ones the user
        actually sees, with no offset to compensate.
       */}

      {/* The whole panel sits between the app background and the white
          chrome (surface2): header, chips and list share one colour, and
          the docked tab bar plus the floating pills read against it. */}
      <section
        aria-label={t('results_label')}
        className={cn(
          'bg-surface2 shadow-e2 absolute z-20 hidden flex-col overflow-hidden rounded-xl transition-opacity duration-300 md:flex',
          leaving && 'opacity-0',
        )}
        style={{ top: FRAME, bottom: FRAME, left: FRAME, width: `${PANEL_FRACTION * 100}%` }}>
        <div className="px-3 pt-3 pb-2">
          <SearchBar
            value={query}
            onValueChange={setQuery}
            leading={
              selectedId ? (
                <button
                  type="button"
                  aria-label={t('search_back_area')}
                  onClick={resetFocus}
                  className="flex size-full items-center justify-center">
                  <ArrowLeft size={20} />
                </button>
              ) : (
                <Search size={19} />
              )
            }
            trailing={
              <>
                {query ? (
                  <button
                    type="button"
                    aria-label={t('search_clear')}
                    onClick={() => setQuery('')}
                    className="text-mute hover:text-ink flex size-8 items-center justify-center">
                    <X size={16} />
                  </button>
                ) : null}
                <AccountButton />
              </>
            }
          />
        </div>

        {resultsHeader}

        {resultsChips}

        {sourceChips}

        <div
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pt-2"
          style={{ paddingBottom: TABBAR_RESERVED }}>
          {resultsRows}
        </div>
      </section>

      {/* POI detail pushed over the map + drawer (full-screen on mobile, the
          framed map box on wide layouts), so everything underneath stays
          mounted and popping back restores it untouched. */}
      <AnimatePresence>
        {detailPoi ? (
          <PoiDetailScreen
            key={poiKey(detailPoi)}
            poi={detailPoi}
            pending={detailPending}
            mapStyleUrl={mapStyleUrl}
            onClose={closeDetail}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
