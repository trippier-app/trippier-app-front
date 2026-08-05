'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import MapLibreMap, { Marker, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  ArrowLeft,
  Bookmark,
  Check,
  ChevronDown,
  Clock,
  ExternalLink,
  Globe,
  MapPin,
  Phone,
  Share,
} from '@/components/icons';
import { useT } from '@/components/I18nProvider';
import { cn } from '@/lib/cn';
import { poiTypeKey } from '@/lib/discover';
import type { TranslateFn } from '@/lib/i18n';
import {
  buildSourceLinks,
  extractWikidataId,
  providerLabel,
  toPreviewUrl,
  type PoiSourceLink,
} from '@/lib/poiSources';
import type { EnrichedPoi, PoiContact, PoiType } from '@/lib/pois';

/**
 * Geometry constants mirrored from the Discover screen. The hero media keeps
 * its **bottom edge** aligned with the default-open Discover cutout, but its
 * top reclaims the search-bar strip: it starts right under the top frame, so
 * the floating header buttons ride its top corners. Kept in lockstep with
 * DiscoverScreen's SEARCH_TOP + SEARCH_BAR_H + FRAME — if any of those moves
 * there, they move here too.
 */
const SEARCH_BAR_H = 52;
const SEARCH_TOP = 19;
const SEARCH_X = 20;
const FRAME = 12;
const PANEL_FRACTION = 1 / 3;
const WIDE_MQ = '(min-width: 768px)';
/**
 * Size of the round floating header buttons. The back one copies the exact
 * footprint of the search bar's 42px leading slot on the Discover screen —
 * x at SEARCH_X against the pill's left cap, y centred on the 52px bar — so
 * the two back arrows land on the same pixel across screens.
 */
const HEADER_BTN = 42;
/**
 * Default-open Discover drawer covers 2/3 of the useful vertical space,
 * leaving 1/3 for the map cutout. We reuse the same denominator here so the
 * detail media's bottom edge matches the framed map on the previous screen.
 */
const MAP_HEIGHT_FRACTION = 1 / 3;
/**
 * Tilt of the orbiting camera. Kept under 60°: paired with {@link MAP_ZOOM}'s
 * altitude it reads as a drone shot — at street-level height a steeper pitch
 * ploughs the camera through the extruded buildings and the frame fills with
 * grey masses, as if the viewer were below ground.
 */
const MAP_PITCH_DEG = 55;
/** Zoom level for the orbiting camera; see {@link MAP_PITCH_DEG}. */
const MAP_ZOOM = 16;
/** Cap on the rendered description, mirrored from the mobile app. */
const DESCRIPTION_MAX_CHARS = 4000;
/** Fixed embedded preview height — tall enough to read a headline + lead
 *  paragraph on Wikipedia-style pages without dominating the detail screen. */
const PREVIEW_HEIGHT = 460;
/** Fade of the whole screen when pushed/popped, matching the drawer easing. */
const FADE_EASE = [0.4, 0, 0.2, 1] as const;
/** Idle time on a slide before the hero carousel pages to the next one. */
const AUTO_SCROLL_MS = 5000;

/**
 * Maps the public-API POI type to the human-readable eyebrow label.
 *
 * @param type - POI category as returned by the API.
 * @returns A short capitalised label.
 */
function typeEyebrow(type: PoiType, t: TranslateFn): string {
  return t(poiTypeKey(type, 'type_label'));
}

/** Small accent-colored mono lowercase label used above section headings. */
function Eyebrow({ children }: { children: string }) {
  return (
    <p className="text-emerald font-mono text-[12px] tracking-[0.6px]">{children.toLowerCase()}</p>
  );
}

/** Small status pill overlaid on the hero media, ported from the mobile Tag. */
function Tag({
  variant,
  dot = false,
  children,
}: {
  variant: 'ink' | 'emerald';
  dot?: boolean;
  children: string;
}) {
  return (
    <span
      className={cn(
        'flex items-center gap-[5px] rounded-pill px-2.5 py-1 text-[11px] font-semibold tracking-[0.1px]',
        variant === 'ink' ? 'bg-ink text-on-emerald' : 'bg-emerald-soft text-emerald-deep',
      )}>
      {dot ? <span className="size-1.5 rounded-pill bg-current" /> : null}
      {children}
    </span>
  );
}

/**
 * Live hero map slide: a static (gesture-less) 3D view slowly orbiting the
 * place. The orbit chains linear `rotateTo` segments and replaces the running
 * animation **before** it ends, so the camera never pauses between segments —
 * the same trick as the mobile MapTilerMap's autoRotate.
 */
function HeroMapSlide({
  lat,
  lng,
  styleUrl,
}: {
  lat: number;
  lng: number;
  styleUrl: string | null;
}) {
  const t = useT();
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    const SEGMENT_DEG = 90;
    const SEGMENT_MS = 6000;
    const CHAIN_AT_MS = SEGMENT_MS - 250;
    let heading = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      heading += SEGMENT_DEG;
      mapRef.current?.rotateTo(heading, { duration: SEGMENT_MS, easing: t => t });
      timeoutId = setTimeout(tick, CHAIN_AT_MS);
    };
    timeoutId = setTimeout(tick, 400);
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  if (!styleUrl) {
    return (
      <div className="bg-surface2 text-mute flex h-full items-center justify-center px-10 text-center font-mono text-[12px]">
        {t('map_missing_keys')}
      </div>
    );
  }

  return (
    // pointer-events-none freezes every gesture, so a swipe over the map
    // slide pages the carousel instead of panning the camera.
    <div className="pointer-events-none h-full w-full">
      <MapLibreMap
        ref={mapRef}
        initialViewState={{ longitude: lng, latitude: lat, zoom: MAP_ZOOM, pitch: MAP_PITCH_DEG }}
        mapStyle={styleUrl}
        // No attribution here: it would sit on top of the tags + dots the
        // carousel overlays on the media. The Discover map keeps the credit.
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}>
        <Marker latitude={lat} longitude={lng} anchor="center">
          <span className="relative flex size-6 items-center justify-center">
            <span className="bg-emerald/20 absolute inset-0 rounded-pill" />
            <span className="bg-emerald size-3.5 rounded-pill ring-[1.5px] ring-white/90" />
          </span>
        </Marker>
      </MapLibreMap>
    </div>
  );
}

/**
 * Detail-screen "Contact" section. Renders one row per non-empty contact
 * field. Tappable rows (website / phone / email) are real links launching the
 * matching intent (browser, dialer, mail composer). Opening hours is
 * informational only. The section hides itself when nothing relevant is set.
 */
function ContactSection({ contact }: { contact?: PoiContact }) {
  const t = useT();
  if (!contact) {
    return null;
  }
  const rows: Array<{
    key: string;
    label: string;
    value: string;
    icon: React.ReactNode;
    href?: string;
  }> = [];
  if (contact.website) {
    rows.push({
      key: 'website',
      label: t('detail_website'),
      value: contact.website.replace(/^https?:\/\//, ''),
      icon: <Globe size={15} />,
      href: contact.website,
    });
  }
  if (contact.phone) {
    rows.push({
      key: 'phone',
      label: t('detail_phone'),
      value: contact.phone,
      icon: <Phone size={15} />,
      href: `tel:${contact.phone.replace(/\s+/g, '')}`,
    });
  }
  if (contact.email) {
    rows.push({
      key: 'email',
      label: t('detail_email'),
      value: contact.email,
      icon: <ExternalLink size={15} />,
      href: `mailto:${contact.email}`,
    });
  }
  if (contact.opening_hours) {
    rows.push({
      key: 'hours',
      label: t('detail_hours'),
      value: contact.opening_hours,
      icon: <Clock size={15} />,
    });
  }
  if (rows.length === 0) {
    return null;
  }
  return (
    <div className="mt-[18px] flex flex-col gap-2">
      <Eyebrow>{t('detail_contact')}</Eyebrow>
      <div className="border-line bg-surface mt-1 overflow-hidden rounded-lg border">
        {rows.map((row, index) => {
          const rowClass = cn(
            'flex items-center justify-between gap-4 px-[18px] py-[13px]',
            index > 0 && 'border-line border-t',
          );
          const inner = (
            <>
              <span className="text-mute flex shrink-0 items-center gap-2.5">
                {row.icon}
                <span className="text-[13px] font-semibold tracking-[-0.1px]">{row.label}</span>
              </span>
              <span className="text-ink min-w-0 truncate text-right text-[14px] font-semibold tracking-[-0.15px]">
                {row.value}
              </span>
            </>
          );
          if (!row.href) {
            return (
              <div key={row.key} className={rowClass}>
                {inner}
              </div>
            );
          }
          return (
            <a
              key={row.key}
              href={row.href}
              target={row.href.startsWith('http') ? '_blank' : undefined}
              rel="noreferrer"
              aria-label={t('detail_open_link', { label: row.label, value: row.value })}
              className={cn(rowClass, 'transition-opacity hover:opacity-60')}>
              {inner}
            </a>
          );
        })}
      </div>
    </div>
  );
}

interface SourceRowDef {
  key: string;
  label: string;
  url: string;
}

/**
 * Single source row. Clicking the row toggles an inline preview that slots
 * **between this row and the next one**, mimicking the system-level accordion
 * pattern. The chevron rotates 180° in lockstep with the expand/collapse.
 *
 * The preview never replaces the row's original destination — an "Open …"
 * affordance still lets the user kick the URL out to a full browser tab.
 */
function SourceRow({
  row,
  index,
  isExpanded,
  onToggle,
}: {
  row: SourceRowDef;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const t = useT();
  return (
    <div className={cn(index > 0 && 'border-line border-t')}>
      <div className="flex items-center gap-3.5 px-[18px] py-[13px]">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-label={t(isExpanded ? 'detail_collapse' : 'detail_expand', { label: row.label })}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left transition-opacity hover:opacity-70">
          <Globe size={16} className="text-mute shrink-0" />
          <span className="text-ink truncate text-[14.5px] font-semibold tracking-[-0.15px]">
            {row.label}
          </span>
        </button>
        <a
          href={row.url}
          target="_blank"
          rel="noreferrer"
          aria-label={t('detail_open_browser', { label: row.label })}
          className="text-mute p-0.5 transition-opacity hover:opacity-50">
          <ExternalLink size={16} />
        </a>
        <button
          type="button"
          onClick={onToggle}
          aria-label={t(isExpanded ? 'detail_collapse' : 'detail_expand', { label: row.label })}
          className="text-mute transition-opacity hover:opacity-50">
          <ChevronDown
            size={16}
            className={cn('transition-transform duration-200', isExpanded && 'rotate-180')}
          />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: PREVIEW_HEIGHT }}
            exit={{ height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="border-line bg-surface2 overflow-hidden border-t">
            <div className="relative" style={{ height: PREVIEW_HEIGHT }}>
              {/* The spinner sits behind the (initially transparent) frame,
                  so it shows while the page loads and vanishes under it. */}
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="border-emerald size-5 animate-spin rounded-pill border-2 border-t-transparent" />
              </span>
              <iframe
                src={toPreviewUrl(row.url)}
                title={t('detail_preview_title', { label: row.label })}
                loading="lazy"
                className="relative h-full w-full border-0"
              />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * Detail-screen "Sources" section. Renders the canonical back-to-source links
 * (OpenStreetMap, Wikipedia, Wikivoyage, …) as an accordion of rows with an
 * inline preview per row. Only one row stays expanded at a time so the
 * section never grows past one screen of content. Hides itself entirely when
 * there's nothing to show — callers don't need to guard.
 */
function SourcesSection({
  sources,
  wikidataId,
}: {
  sources: PoiSourceLink[];
  wikidataId?: string;
}) {
  const t = useT();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const rows: SourceRowDef[] = sources.map(source => ({
    key: `src-${source.provider}`,
    label: providerLabel(source.provider),
    url: source.url,
  }));
  if (wikidataId) {
    rows.push({
      key: 'wikidata',
      label: 'Wikidata',
      url: `https://www.wikidata.org/wiki/${wikidataId}`,
    });
  }
  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="mt-[18px] flex flex-col gap-2">
      <Eyebrow>{t('detail_sources')}</Eyebrow>
      <div className="border-line bg-surface mt-1 overflow-hidden rounded-lg border">
        {rows.map((row, index) => (
          <SourceRow
            key={row.key}
            row={row}
            index={index}
            isExpanded={expandedKey === row.key}
            onToggle={() => setExpandedKey(previous => (previous === row.key ? null : row.key))}
          />
        ))}
      </div>
    </div>
  );
}

type Slide = { kind: 'map' } | { kind: 'image'; url: string };

/**
 * Subscribes to the tablet/desktop breakpoint. Server snapshot is `false`,
 * which is safe: the detail overlay only ever mounts client-side, after an
 * interaction or a resolved deep link.
 */
function subscribeToWide(onChange: () => void): () => void {
  const query = window.matchMedia(WIDE_MQ);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function useIsWide(): boolean {
  return useSyncExternalStore(
    subscribeToWide,
    () => window.matchMedia(WIDE_MQ).matches,
    () => false,
  );
}

interface PoiDetailScreenProps {
  poi: EnrichedPoi;
  /** True while a shared link is still resolving the place. */
  pending?: boolean;
  /** MapTiler style URL resolved server-side; null when the key is unset. */
  mapStyleUrl: string | null;
  onClose: () => void;
}

/**
 * POI detail overlay reached from the Discover drawer, ported from the mobile
 * app's PoiDetailScreen. Hero carousel that cycles a live rotating map slide
 * followed by every gallery image the provider exposed; below the carousel
 * comes the eyebrow + dotted title, an optional description, a compact
 * lat/lng line, a Contact card (when the POI carries one) and the Sources
 * accordion. A sticky action pair at the bottom offers Directions +
 * Save-to-trip.
 *
 * When the POI lacks coordinates the map slide is skipped — the carousel
 * still works, just starting on the first image, and the lat/lng line
 * disappears entirely.
 *
 * Rendered as an overlay fading in over the map, so the Discover map and
 * drawer stay mounted (and untouched) underneath. Full-screen on mobile; on
 * wide layouts it takes the framed map box only, keeping the results panel
 * on the left visible and interactive.
 *
 * @param props - The place to render and the close callback.
 * @returns The POI detail overlay.
 */
export default function PoiDetailScreen({
  poi,
  pending = false,
  mapStyleUrl,
  onClose,
}: PoiDetailScreenProps) {
  const t = useT();
  const wide = useIsWide();
  const rootRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [rootH, setRootH] = useState(0);
  const [slideIndex, setSlideIndex] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);

  const hasCoords = poi.coords !== undefined;
  const description = poi.description?.slice(0, DESCRIPTION_MAX_CHARS);
  const sources = useMemo(() => buildSourceLinks(poi), [poi]);
  const wikidataId = extractWikidataId(poi);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => setRootH(entry.contentRect.height));
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  // Mirror the Discover screen's frame math so the media's bottom edge is
  // pixel-aligned with the framed cutout the user just left, while its top
  // rises to the frame — the extra height lets the header buttons ride its
  // top corners.
  const cutoutTop = SEARCH_TOP + SEARCH_BAR_H + FRAME;
  const mediaBottom = cutoutTop + Math.max(0, rootH - cutoutTop) * MAP_HEIGHT_FRACTION;
  const mapH = Math.max(0, mediaBottom - FRAME);

  // Build the slide deck: rotating live map first (when geolocated), then
  // thumbnail, then any additional gallery images. Dedupe so the lead
  // thumbnail isn't repeated as the second slide when it's already part of
  // `images`.
  const slides = useMemo<Slide[]>(() => {
    const out: Slide[] = [];
    if (hasCoords) {
      out.push({ kind: 'map' });
    }
    const seen = new Set<string>();
    const pushImage = (url?: string): void => {
      if (!url || seen.has(url)) {
        return;
      }
      seen.add(url);
      out.push({ kind: 'image', url });
    };
    pushImage(poi.thumbnail);
    for (const url of poi.images ?? []) {
      pushImage(url);
    }
    return out;
  }, [hasCoords, poi.thumbnail, poi.images]);

  const handleCarouselScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const carousel = event.currentTarget;
    if (carousel.clientWidth <= 0) {
      return;
    }
    const index = Math.round(carousel.scrollLeft / carousel.clientWidth);
    setSlideIndex(previous => (previous === index ? previous : index));
  }, []);

  // Auto-advance the deck: after an idle window, page to the next slide,
  // wrapping back to the first. Keyed on slideIndex — a manual swipe lands on
  // a new index and re-arms the full delay, so the carousel never fights the
  // user's own gesture.
  useEffect(() => {
    if (slides.length < 2) {
      return;
    }
    const timer = setTimeout(() => {
      const carousel = carouselRef.current;
      if (!carousel) {
        return;
      }
      const next = (slideIndex + 1) % slides.length;
      carousel.scrollTo({ left: next * carousel.clientWidth, behavior: 'smooth' });
    }, AUTO_SCROLL_MS);
    return () => clearTimeout(timer);
  }, [slideIndex, slides.length]);

  /**
   * Shares the detail page's own URL — the address bar already carries the
   * `?poi=…` deep link while this screen is open. Native share sheet when the
   * browser has one, clipboard copy (with a transient check) otherwise.
   */
  const handleShare = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: poi.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
    } catch {
      // The user dismissed the share sheet, or clipboard access was denied.
    }
  }, [poi.name]);

  useEffect(() => {
    if (!linkCopied) {
      return;
    }
    const timer = setTimeout(() => setLinkCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [linkCopied]);

  return (
    <motion.div
      ref={rootRef}
      className={cn(
        'bg-surface absolute z-40',
        wide ? 'shadow-e2 overflow-hidden rounded-xl' : 'inset-0',
      )}
      // On wide layouts the overlay takes the exact footprint of the framed
      // map box, so the results panel on the left stays visible and alive.
      style={
        wide
          ? {
              top: FRAME,
              bottom: FRAME,
              right: FRAME,
              left: `calc(${PANEL_FRACTION * 100}% + ${2 * FRAME}px)`,
            }
          : undefined
      }
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: FADE_EASE }}>
      <div className="no-scrollbar h-full overflow-y-auto">
        {/* On wide layouts the hero sits 12px inside the rounded detail box,
            so its corner radius shrinks by that gap (30 → 18) to keep the
            two curves concentric instead of pinching at the corners. */}
        <div
          className="bg-emerald-soft shadow-e1 relative mx-3 overflow-hidden rounded-xl md:rounded-[18px]"
          style={{ marginTop: FRAME, height: mapH }}>
          {slides.length === 0 ? null : (
            <div
              ref={carouselRef}
              onScroll={handleCarouselScroll}
              className="no-scrollbar flex h-full snap-x snap-mandatory overflow-x-auto">
              {slides.map((slide, index) =>
                slide.kind === 'map' ? (
                  <div key="map" className="h-full w-full shrink-0 snap-center">
                    <HeroMapSlide
                      lat={poi.coords!.lat}
                      lng={poi.coords!.lng}
                      styleUrl={mapStyleUrl}
                    />
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- provider images come from arbitrary hosts next/image is not configured for
                  <img
                    key={`${index}:${slide.url}`}
                    src={slide.url}
                    alt={poi.name}
                    draggable={false}
                    className="h-full w-full shrink-0 snap-center object-cover"
                  />
                ),
              )}
            </div>
          )}
          <div className="pointer-events-none absolute bottom-4 left-4 flex gap-2">
            {pending ? null : <Tag variant="ink">{typeEyebrow(poi.type, t)}</Tag>}
            {hasCoords ? (
              <Tag variant="emerald" dot>
                {t('detail_located')}
              </Tag>
            ) : null}
          </div>
          {slides.length > 1 ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-[5px]">
              {slides.map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    'size-1.5 rounded-pill',
                    index === slideIndex ? 'bg-on-emerald' : 'bg-white/45',
                  )}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 px-[22px] pt-[22px] pb-[110px]">
          {pending ? (
            <div className="bg-surface2 h-3.5 w-24 animate-pulse rounded-pill" />
          ) : (
            <Eyebrow>{typeEyebrow(poi.type, t)}</Eyebrow>
          )}
          <h1 className="text-ink mt-2 text-[32px] font-bold tracking-[-0.96px]">
            {poi.name}
            <span className="text-emerald">.</span>
          </h1>

          {pending ? (
            <div className="mt-1 flex flex-col gap-2">
              <div className="bg-surface2 h-3.5 w-full animate-pulse rounded-pill" />
              <div className="bg-surface2 h-3.5 w-11/12 animate-pulse rounded-pill" />
              <div className="bg-surface2 h-3.5 w-2/3 animate-pulse rounded-pill" />
            </div>
          ) : description ? (
            <p className="text-ink2 mt-1 text-[14.5px] leading-[22px]">{description}</p>
          ) : (
            <p className="text-mute font-mono text-[12.5px]">{t('detail_no_description')}</p>
          )}

          {hasCoords ? (
            <p className="text-mute mt-1.5 flex items-center gap-1.5">
              <MapPin size={13} />
              <span className="font-mono text-[12.5px] tracking-[-0.1px]">
                {poi.coords!.lat.toFixed(4)} · {poi.coords!.lng.toFixed(4)}
              </span>
            </p>
          ) : null}

          {pending ? null : (
            <>
              <ContactSection contact={poi.contact} />
              <SourcesSection sources={sources} wikidataId={wikidataId} />
            </>
          )}
        </div>
      </div>

      <div
        className="pointer-events-none absolute flex justify-between"
        style={{
          top: SEARCH_TOP + (SEARCH_BAR_H - HEADER_BTN) / 2,
          left: SEARCH_X,
          right: SEARCH_X,
        }}>
        <button
          type="button"
          aria-label={t('detail_back')}
          onClick={onClose}
          className="border-line bg-surface text-ink shadow-e1 pointer-events-auto flex size-[42px] items-center justify-center rounded-pill border">
          <ArrowLeft size={20} />
        </button>
        <button
          type="button"
          aria-label={t(linkCopied ? 'detail_link_copied' : 'detail_share')}
          onClick={handleShare}
          className="border-line bg-surface shadow-e1 pointer-events-auto flex size-[42px] items-center justify-center rounded-pill border">
          {linkCopied ? (
            <Check size={18} className="text-emerald" />
          ) : (
            <Share size={18} className="text-ink" />
          )}
        </button>
      </div>

      <div className="bg-surface absolute inset-x-0 bottom-0 flex gap-2.5 px-[18px] pt-3 pb-5">
        <button
          type="button"
          className="border-line bg-surface text-ink flex flex-1 items-center justify-center gap-[9px] rounded-pill border-[1.5px] py-[15px] text-[15px] font-semibold tracking-[-0.1px]">
          <MapPin size={17} />
          {t('detail_directions')}
        </button>
        <button
          type="button"
          className="bg-emerald text-on-emerald flex flex-[1.3] items-center justify-center gap-[9px] rounded-pill py-[15px] text-[15px] font-semibold tracking-[-0.1px]">
          <Bookmark size={17} />
          {t('detail_save')}
        </button>
      </div>
    </motion.div>
  );
}
