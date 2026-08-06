'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import MapLibreMap, { Layer, Source, type MapLayerMouseEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { MapRef } from 'react-map-gl/maplibre';
import type { ExpressionSpecification, FilterSpecification } from 'maplibre-gl';
import { useT } from '@/components/I18nProvider';
import { COUNTRY_FRAMES } from '@/lib/countryFrames';
import type { CountryStatus, CountryVisit } from '@/lib/social';

/** Source layer of the MapTiler countries tileset holding the polygons. */
const SOURCE_LAYER = 'administrative';

/** Administrative level of a sovereign country, as opposed to its subdivisions. */
const COUNTRY_LEVEL = 0;

/** Layer that only exists to catch clicks, under everything painted. */
const HIT_LAYER = 'countries-hit';

/** Side of the generated hatch tile, in pixels. */
const HATCH_SIZE = 12;

/** Stroke width of the stripes; thin enough to read as hatching, thick enough to see. */
const HATCH_STROKE = 2;

const PAINT = {
  DONE: { pattern: 'hatch-done', color: '#0c9466' },
  WANT: { pattern: 'hatch-want', color: '#e8833a' },
} as const;

/** Matches a sovereign country rather than one of its subdivisions. */
const IS_COUNTRY: ExpressionSpecification = ['==', ['get', 'level'], COUNTRY_LEVEL];

/**
 * Filter matching the countries a user put in one given state.
 *
 * @param codes - The ISO 3166-1 alpha-2 codes in that state.
 * @returns The layer filter.
 */
function flaggedAs(codes: string[]): FilterSpecification {
  return ['all', IS_COUNTRY, ['in', ['get', 'iso_a2'], ['literal', codes]]];
}

/**
 * Draws the diagonal hatch tile the fill layers repeat over a country.
 *
 * The stripes are the lines `y = -x + c`, drawn for the three offsets that
 * cross the tile: the two through opposite corners, which only join up once
 * the tile repeats, and the one down the middle, which is the stripe actually
 * read as hatching.
 *
 * @param color - Stroke colour of the stripes.
 * @returns The tile as pixel data, or null when no canvas is available.
 */
function hatchTile(color: string): ImageData | null {
  const canvas = document.createElement('canvas');
  canvas.width = HATCH_SIZE;
  canvas.height = HATCH_SIZE;
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }
  context.strokeStyle = color;
  context.lineWidth = HATCH_STROKE;
  context.beginPath();
  for (const offset of [0, HATCH_SIZE, HATCH_SIZE * 2]) {
    context.moveTo(-HATCH_SIZE, offset + HATCH_SIZE);
    context.lineTo(offset + HATCH_SIZE, -HATCH_SIZE);
  }
  context.stroke();
  return context.getImageData(0, 0, HATCH_SIZE, HATCH_SIZE);
}

interface CountryMapProps {
  /** MapTiler style URL resolved server-side; null when the key is unset. */
  styleUrl: string | null;
  /** TileJSON of the administrative polygons; null when the key is unset. */
  countriesUrl: string | null;
  statuses: CountryStatus[];
  /** The country whose sheet is open, kept lit while it is. */
  selectedCode?: string | null;
  /** Omitted on someone else's page, where the map is read-only. */
  onSelect?: (code: string, name: string) => void;
}

/**
 * World map colouring every flagged country: emerald for the ones visited,
 * orange for the ones still wanted, each a translucent tint under hatching so
 * the map beneath stays readable.
 *
 * The polygons come from the basemap's own provider rather than a dataset of
 * our own, which is what makes a fill sit on the border already drawn instead
 * of beside it, and what lets the outline sharpen as the camera comes down.
 *
 * @param props - The two sources, the flagged countries and the handler.
 * @returns The country map.
 */
export default function CountryMap({
  styleUrl,
  countriesUrl,
  statuses,
  selectedCode,
  onSelect,
}: CountryMapProps) {
  const t = useT();
  const mapRef = useRef<MapRef>(null);
  const [patternsReady, setPatternsReady] = useState(false);

  const codesBy = useMemo(() => {
    const grouped: Record<CountryVisit, string[]> = { DONE: [], WANT: [] };
    for (const status of statuses) {
      grouped[status.status]?.push(status.countryCode);
    }
    return grouped;
  }, [statuses]);

  const registerPatterns = useCallback((map: MapRef) => {
    for (const { pattern, color } of Object.values(PAINT)) {
      const tile = hatchTile(color);
      if (!tile) {
        continue;
      }
      if (map.hasImage(pattern)) {
        map.updateImage(pattern, tile);
      } else {
        map.addImage(pattern, tile);
      }
    }
    setPatternsReady(true);
  }, []);

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const properties = event.features?.[0]?.properties as
        { iso_a2?: string; name?: string } | undefined;
      const code = properties?.iso_a2?.toUpperCase();
      if (!code || !onSelect) {
        return;
      }
      const frame = COUNTRY_FRAMES[code];
      if (frame) {
        mapRef.current?.fitBounds(frame.bounds, { padding: 80, duration: 900, maxZoom: 6 });
      }
      onSelect(code, properties?.name ?? frame?.name ?? code);
    },
    [onSelect],
  );

  if (!styleUrl || !countriesUrl) {
    return (
      <div className="bg-surface2 text-mute flex h-full items-center justify-center px-10 text-center font-mono text-[12px]">
        {t('map_missing_keys')}
      </div>
    );
  }

  return (
    <MapLibreMap
      ref={mapRef}
      initialViewState={{ longitude: 10, latitude: 25, zoom: 1.1 }}
      mapStyle={styleUrl}
      attributionControl={false}
      onLoad={event => registerPatterns(event.target as unknown as MapRef)}
      onClick={handleClick}
      interactiveLayerIds={onSelect ? [HIT_LAYER] : []}
      cursor={onSelect ? 'pointer' : 'grab'}
      style={{ width: '100%', height: '100%' }}>
      <Source id="countries" type="vector" url={countriesUrl}>
        <Layer
          id={HIT_LAYER}
          type="fill"
          source-layer={SOURCE_LAYER}
          filter={IS_COUNTRY}
          paint={{ 'fill-color': '#000000', 'fill-opacity': 0 }}
        />
        {(['DONE', 'WANT'] as const).map(state => (
          <Layer
            key={`${state}-tint`}
            id={`countries-${state.toLowerCase()}-tint`}
            type="fill"
            source-layer={SOURCE_LAYER}
            filter={flaggedAs(codesBy[state])}
            paint={{ 'fill-color': PAINT[state].color, 'fill-opacity': 0.14 }}
          />
        ))}
        {patternsReady
          ? (['DONE', 'WANT'] as const).map(state => (
              <Layer
                key={`${state}-hatch`}
                id={`countries-${state.toLowerCase()}-hatch`}
                type="fill"
                source-layer={SOURCE_LAYER}
                filter={flaggedAs(codesBy[state])}
                paint={{ 'fill-pattern': PAINT[state].pattern, 'fill-opacity': 0.55 }}
              />
            ))
          : null}
        <Layer
          id="countries-flagged-outline"
          type="line"
          source-layer={SOURCE_LAYER}
          filter={flaggedAs([...codesBy.DONE, ...codesBy.WANT])}
          paint={{ 'line-color': '#18211d', 'line-opacity': 0.35, 'line-width': 0.8 }}
        />
        <Layer
          id="countries-selected-outline"
          type="line"
          source-layer={SOURCE_LAYER}
          filter={
            [
              'all',
              IS_COUNTRY,
              ['==', ['get', 'iso_a2'], selectedCode ?? ''],
            ] as FilterSpecification
          }
          paint={{ 'line-color': '#18211d', 'line-opacity': 0.9, 'line-width': 2 }}
        />
      </Source>
    </MapLibreMap>
  );
}
