'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import Chip from '@/components/Chip';
import { useCircleTransition } from '@/components/CircleTransition';
import { useI18n, useT } from '@/components/I18nProvider';
import MapView, { type MapMarker, type MapViewHandle } from '@/components/MapView';
import { useMaps } from '@/components/MapsProvider';
import PoiRow from '@/components/PoiRow';
import { Layers } from '@/components/icons';
import { cn } from '@/lib/cn';
import { DISCOVER_DEFAULT_CENTER, DISCOVER_DEFAULT_ZOOM, poiTypeKey } from '@/lib/discover';
import type { SavedPoi } from '@/lib/maps';
import type { PoiType } from '@/lib/pois';

const TABBAR_RESERVED = 88;
const FRAME = 12;
const PANEL_FRACTION = 1 / 3;
const WIDE_MQ = '(min-width: 768px)';
/** Zoom used when framing a single place, matching the Discover screen. */
const FOCUS_ZOOM = 16;
/** Padding, in degrees, around the bounding box of everything on show. */
const FIT_PADDING_DEG = 0.01;

/** A saved place paired with the map it belongs to. */
interface PlacedPoi {
  poi: SavedPoi;
  mapId: number;
  mapTitle: string;
}

interface MapsScreenProps {
  /** MapTiler style URL resolved server-side; null when the key is unset. */
  mapStyleUrl: string | null;
}

/**
 * The user's maps over a live map: chips pick which maps are on show, the
 * list holds their saved places, and the two stay in step — selecting a row
 * lights its pin, exactly as on the Discover screen.
 *
 * The camera frames whatever is selected rather than following a search, so
 * this screen has no viewport-driven fetching: everything is already loaded.
 *
 * @param props - The resolved map style.
 * @returns The maps screen.
 */
export default function MapsScreen({ mapStyleUrl }: MapsScreenProps) {
  const t = useT();
  const { locale } = useI18n();
  const { user } = useAuth();
  const { maps, pending } = useMaps();
  const { navigate } = useCircleTransition();
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

  const mapRef = useRef<MapViewHandle>(null);
  const [selectedMapIds, setSelectedMapIds] = useState<number[] | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | undefined>();
  const [wide, setWide] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(WIDE_MQ);
    const sync = () => setWide(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  // Null means "not chosen yet", which shows every map: a screen that opens
  // empty would make the user work before seeing anything.
  const activeIds = useMemo(
    () => selectedMapIds ?? maps.map(map => map.id),
    [selectedMapIds, maps],
  );

  const places = useMemo<PlacedPoi[]>(
    () =>
      maps
        .filter(map => activeIds.includes(map.id))
        .flatMap(map => map.pois.map(poi => ({ poi, mapId: map.id, mapTitle: map.title }))),
    [maps, activeIds],
  );

  const toggleMap = (mapId: number) => {
    setSelectedMapIds(current => {
      const base = current ?? maps.map(map => map.id);
      return base.includes(mapId) ? base.filter(id => id !== mapId) : [...base, mapId];
    });
  };

  const focusOn = useCallback((poi: SavedPoi) => {
    setSelectedPoiId(poi.place_id);
    mapRef.current?.flyTo(poi.lat, poi.lng, { zoom: FOCUS_ZOOM });
  }, []);

  // Frame everything on show whenever the selection changes, so picking a map
  // takes the user to it instead of leaving them wherever they were.
  const fitKey = places.map(place => place.poi.place_id).join('|');
  useEffect(() => {
    if (!mapReady || places.length === 0) {
      return;
    }
    const lats = places.map(place => place.poi.lat);
    const lngs = places.map(place => place.poi.lng);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const spread = Math.max(
      Math.max(...lats) - Math.min(...lats),
      Math.max(...lngs) - Math.min(...lngs),
      FIT_PADDING_DEG,
    );
    // 360° of longitude spans the world at zoom 0, and each level halves it.
    const zoom = Math.min(FOCUS_ZOOM, Math.max(2, Math.log2(360 / spread) - 1));
    mapRef.current?.flyTo(centerLat, centerLng, { zoom });
    // Only the composition of what is on show should move the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey, mapReady]);

  const markers = useMemo<MapMarker[]>(
    () =>
      places.map(({ poi }) => ({
        id: poi.place_id,
        lat: poi.lat,
        lng: poi.lng,
        type: (poi.category ?? '') as PoiType,
        onSelect: () => focusOn(poi),
      })),
    [places, focusOn],
  );

  const header = (
    <header className="px-5 pb-2">
      <h2 className="text-ink text-[22px] font-bold tracking-tight">
        {t('maps_title')}
        <span className="bg-emerald ml-1 inline-block size-1.5 rounded-pill align-middle" />
      </h2>
      <p className="text-mute mt-1 truncate font-mono text-[12.5px]">
        {maps.length === 0
          ? t('maps_empty')
          : t(places.length === 1 ? 'maps_count_one' : 'maps_count', {
              count: new Intl.NumberFormat(locale).format(places.length),
            })}
      </p>
    </header>
  );

  const chips =
    maps.length === 0 ? null : (
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2.5">
        {maps.map(map => (
          <Chip
            key={map.id}
            label={`${map.icon ? `${map.icon} ` : ''}${map.title}`}
            active={activeIds.includes(map.id)}
            onClick={() => toggleMap(map.id)}
          />
        ))}
      </div>
    );

  const rows = (
    <>
      {places.map(({ poi, mapTitle }) => (
        <div key={`${poi.place_id}-${mapTitle}`} data-poi-id={poi.place_id}>
          <PoiRow
            name={poi.name}
            meta={`${t(poiTypeKey((poi.category ?? '') as PoiType, 'poi_type'))} · ${mapTitle}`}
            type={(poi.category ?? '') as PoiType}
            selected={poi.place_id === selectedPoiId}
            onSelect={() => focusOn(poi)}
            onZoom={() => focusOn(poi)}
          />
        </div>
      ))}
      {!pending && maps.length > 0 && places.length === 0 ? (
        <p className="text-mute px-6 py-8 text-center font-mono text-[13px]">
          {t('maps_no_places')}
        </p>
      ) : null}
      {!pending && maps.length === 0 ? (
        <p className="text-mute px-6 py-8 text-center font-mono text-[13px]">
          {t('maps_pick_hint')}
        </p>
      ) : null}
    </>
  );

  if (!user) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
        <span className="bg-emerald-soft text-emerald-deep flex size-16 items-center justify-center rounded-xl">
          <Layers size={26} />
        </span>
        <h1 className="text-ink text-[26px] font-bold tracking-tight">
          {t('maps_title')}
          <span className="bg-emerald ml-1 inline-block size-1.5 rounded-pill align-middle" />
        </h1>
        <p className="text-mute max-w-xs font-mono text-[12.5px]">{t('maps_sign_in_first')}</p>
        <button
          type="button"
          onClick={event => {
            const rect = event.currentTarget.getBoundingClientRect();
            navigate('/login', {
              origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
              tone: 'black',
            });
          }}
          className="bg-emerald text-on-emerald rounded-pill px-6 py-3 text-[14.5px] font-semibold">
          {t('account_sign_in')}
        </button>
      </section>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className={cn('absolute', wide ? 'shadow-e1 overflow-hidden rounded-xl' : 'inset-0')}
        style={
          wide
            ? {
                top: FRAME,
                bottom: FRAME,
                right: FRAME,
                left: `calc(${PANEL_FRACTION * 100}% + ${2 * FRAME}px)`,
              }
            : undefined
        }>
        <MapView
          ref={mapRef}
          styleUrl={mapStyleUrl}
          center={DISCOVER_DEFAULT_CENTER}
          zoom={DISCOVER_DEFAULT_ZOOM}
          markers={markers}
          selectedId={selectedPoiId}
          onBoundsChange={() => setMapReady(true)}
        />
      </div>

      <section
        aria-label={t('maps_title')}
        className={cn(
          'bg-surface2 shadow-e3 absolute z-20 hidden flex-col overflow-hidden rounded-xl pt-4 transition-opacity duration-300 md:flex',
          leaving && 'opacity-0',
        )}
        style={{ top: FRAME, bottom: FRAME, left: FRAME, width: `${PANEL_FRACTION * 100}%` }}>
        {header}
        {chips}
        <div
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2 pt-2"
          style={{ paddingBottom: TABBAR_RESERVED }}>
          {rows}
        </div>
      </section>

      <section
        aria-label={t('maps_title')}
        className={cn(
          'bg-surface shadow-e3 absolute inset-x-3 bottom-0 z-20 flex h-[62%] flex-col overflow-hidden rounded-t-xl pt-4 transition-opacity duration-300 md:hidden',
          leaving && 'opacity-0',
        )}>
        {header}
        {chips}
        <div
          className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-2"
          style={{ paddingBottom: TABBAR_RESERVED }}>
          {rows}
        </div>
      </section>
    </div>
  );
}
