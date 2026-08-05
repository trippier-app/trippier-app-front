'use client';

import { useCallback, useImperativeHandle, useRef } from 'react';
import MapLibreMap, { Marker, type MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useT } from '@/components/I18nProvider';
import { cn } from '@/lib/cn';
import type { MapBounds } from '@/lib/discover';
import type { PoiType } from '@/lib/pois';

/** A pin to paint on the map. */
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  type: PoiType;
  onSelect: () => void;
}

/** Options accepted when flying the camera to a coordinate. */
export interface FlyToOptions {
  zoom?: number;
  /**
   * Horizontal shift, in pixels, of where the target lands relative to the
   * canvas centre. The desktop layout covers the left side of the full-bleed
   * map with the results panel, so the caller passes half its width to land
   * the target in the middle of the visible half.
   */
  offsetX?: number;
  /**
   * Vertical shift, in pixels, of where the target lands relative to the
   * canvas centre. The drawer covers the lower part of a full-bleed map, so
   * the caller passes a negative value to drop the target into the middle of
   * the strip that is actually visible.
   */
  offsetY?: number;
}

/** A camera position that can be captured now and flown back to later. */
export interface MapCamera {
  lat: number;
  lng: number;
  zoom: number;
}

/** Imperative handle exposed to the parent screen. */
export interface MapViewHandle {
  flyTo: (lat: number, lng: number, options?: FlyToOptions) => void;
  getCamera: () => MapCamera | null;
}

/** Edges of the canvas hidden behind the app's chrome, in pixels. */
export interface MapInset {
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
}

interface MapViewProps {
  /** MapTiler style URL resolved server-side; null when the key is unset. */
  styleUrl: string | null;
  /** Occluded edges, so the reported viewport is the one the user can see. */
  inset?: MapInset;
  center: { lat: number; lng: number };
  zoom: number;
  markers: MapMarker[];
  selectedId?: string;
  onBoundsChange: (bounds: MapBounds, center: { lat: number; lng: number }) => void;
  /** Fires only on a real gesture, never on a programmatic camera move. */
  onUserMove?: () => void;
  ref?: React.Ref<MapViewHandle>;
}

/**
 * Discreet single-character glyph painted on the pin core for each POI
 * category, matching the mobile app's `glyphForPoiType` so a user who learns
 * the pins on one surface reads them on the other.
 *
 * @param type - POI category as returned by the public API.
 * @returns A single-character glyph, or an empty string for generic POIs
 *   where a plain dot reads better than a placeholder letter.
 */
function glyphForPoiType(type: PoiType): string {
  switch (type) {
    case 'see':
      return '★';
    case 'eat':
      return 'F';
    case 'drink':
      return 'D';
    case 'do':
      return '▶';
    case 'buy':
      return '$';
    case 'sleep':
      return 'Z';
    case 'event':
      return '♪';
    default:
      return '';
  }
}

/**
 * Full-bleed MapTiler map.
 *
 * The camera is uncontrolled — MapLibre owns it, and the screen only listens
 * for the settled viewport via {@link MapViewProps.onBoundsChange}. Driving it
 * from React state instead would fight the user's own pan and zoom.
 *
 * @param props - Initial camera, pins to draw and the viewport callback.
 * @returns The map canvas.
 */
export default function MapView({
  styleUrl,
  inset,
  center,
  zoom,
  markers,
  selectedId,
  onBoundsChange,
  onUserMove,
  ref,
}: MapViewProps) {
  const t = useT();
  const mapRef = useRef<MapRef>(null);

  useImperativeHandle(ref, () => ({
    flyTo: (lat, lng, { zoom: flyZoom = 16, offsetX = 0, offsetY = 0 } = {}) => {
      mapRef.current?.flyTo({
        center: [lng, lat],
        zoom: flyZoom,
        offset: [offsetX, offsetY],
        duration: 900,
      });
    },
    getCamera: () => {
      const map = mapRef.current;
      if (!map) {
        return null;
      }
      const mapCenter = map.getCenter();
      return { lat: mapCenter.lat, lng: mapCenter.lng, zoom: map.getZoom() };
    },
  }));

  const reportBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }
    const canvas = map.getCanvas();
    const left = inset?.left ?? 0;
    const top = inset?.top ?? 0;
    const right = canvas.clientWidth - (inset?.right ?? 0);
    const bottom = canvas.clientHeight - (inset?.bottom ?? 0);
    if (right <= left || bottom <= top) {
      return;
    }
    const nw = map.unproject([left, top]);
    const se = map.unproject([right, bottom]);
    const visibleCenter = map.unproject([(left + right) / 2, (top + bottom) / 2]);
    onBoundsChange(
      {
        neLat: Math.max(nw.lat, se.lat),
        neLng: Math.max(nw.lng, se.lng),
        swLat: Math.min(nw.lat, se.lat),
        swLng: Math.min(nw.lng, se.lng),
      },
      { lat: visibleCenter.lat, lng: visibleCenter.lng },
    );
  }, [onBoundsChange, inset]);

  if (!styleUrl) {
    return (
      <div className="bg-surface2 text-mute flex h-full items-center justify-center px-10 text-center font-mono text-[12px]">
        {t('map_missing_keys')}
      </div>
    );
  }

  return (
    <MapLibreMap
      ref={mapRef}
      initialViewState={{ longitude: center.lng, latitude: center.lat, zoom }}
      mapStyle={styleUrl}
      attributionControl={false}
      onLoad={reportBounds}
      onMoveStart={event => {
        if (event.originalEvent) {
          onUserMove?.();
        }
      }}
      onMoveEnd={reportBounds}
      style={{ width: '100%', height: '100%' }}>
      {markers.map(marker => {
        const selected = marker.id === selectedId;
        return (
          <Marker
            key={marker.id}
            latitude={marker.lat}
            longitude={marker.lng}
            anchor="bottom"
            onClick={event => {
              event.originalEvent.stopPropagation();
              marker.onSelect();
            }}>
            <button
              type="button"
              aria-label={t('map_place', { id: marker.id })}
              className={cn(
                'flex size-7 items-center justify-center rounded-pill text-[11px] leading-none font-bold',
                'shadow-e2 text-on-emerald ring-2 ring-white/90 transition-transform',
                selected ? 'bg-emerald-deep scale-125' : 'bg-emerald',
              )}>
              {glyphForPoiType(marker.type)}
            </button>
          </Marker>
        );
      })}
    </MapLibreMap>
  );
}
