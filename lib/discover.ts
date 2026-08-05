import type { Dict, TranslateFn } from '@/lib/i18n';
import type { EnrichedPoi, PoiType } from '@/lib/pois';

/**
 * Where the camera sits before anything is known about the user: the whole
 * world, rather than a city they have no reason to care about. Geolocation,
 * when granted, flies it to them at {@link DISCOVER_USER_ZOOM}.
 */
export const DISCOVER_DEFAULT_CENTER = {
  lat: 20,
  lng: 0,
};

/** Initial zoom level on cold boot — the whole globe. */
export const DISCOVER_DEFAULT_ZOOM = 1.4;

/** Zoom the camera settles on once the user's position resolves. */
export const DISCOVER_USER_ZOOM = 14;

/**
 * Chip filter offered above the POI list. The leading "For you" entry sends no
 * `types` at all, letting the API merge everything; each other chip narrows
 * the search to a single category.
 *
 * Only the six categories the search endpoint can actually filter on are
 * exposed. `generic` is skipped because uncategorised results carry an empty
 * type rather than that tag, so the filter matches nothing, and `event` lives
 * on the separate `/v1/pois/events` endpoint.
 */
export interface DiscoverChip {
  id: 'for-you' | PoiType;
  labelKey: keyof Dict;
  types?: PoiType[];
}

export const DISCOVER_CHIPS: DiscoverChip[] = [
  { id: 'for-you', labelKey: 'chip_for_you' },
  { id: 'see', labelKey: 'chip_see', types: ['see'] },
  { id: 'eat', labelKey: 'chip_eat', types: ['eat'] },
  { id: 'drink', labelKey: 'chip_drink', types: ['drink'] },
  { id: 'do', labelKey: 'chip_do', types: ['do'] },
  { id: 'buy', labelKey: 'chip_buy', types: ['buy'] },
  { id: 'sleep', labelKey: 'chip_sleep', types: ['sleep'] },
];

/** Maximum radius accepted by the public `/v1/pois/search` endpoint. */
export const API_MAX_RADIUS_M = 50_000;

/**
 * Floor under which a viewport-derived radius is clamped up, so a tight zoom
 * still returns enough places to fill the drawer.
 */
export const MIN_SEARCH_RADIUS_M = 800;

/**
 * Composes the meta line shown under a POI name in the drawer. The chip label
 * is appended only when it adds information — a single-type chip already
 * matches the POI type, so it is dropped to avoid a redundant "Eat · Eat".
 *
 * @param poi - The POI returned by the API.
 * @param chipLabel - Label of the currently selected filter chip.
 * @returns A short caption — "{type}" or "{type} · {chip}".
 */
export function formatPoiMeta(
  poi: Pick<EnrichedPoi, 'type'>,
  chipLabel: string,
  t: TranslateFn,
): string {
  const type = t(poiTypeKey(poi.type, 'poi_type'));
  if (chipLabel.toLowerCase() === type.toLowerCase()) {
    return type;
  }
  return `${type} · ${chipLabel}`;
}

/**
 * Dictionary key naming a POI category.
 *
 * Uncategorised results come back with an empty type rather than `generic`,
 * and both land on the neutral "place" wording.
 *
 * @param type - POI category as returned by the API.
 * @param prefix - Which family of labels to read: short or descriptive.
 * @returns The matching dictionary key.
 */
export function poiTypeKey(type: PoiType, prefix: 'poi_type' | 'type_label'): keyof Dict {
  const known: PoiType[] = ['see', 'eat', 'drink', 'do', 'buy', 'sleep', 'event'];
  const slug = known.includes(type) ? type : 'place';
  return `${prefix}_${slug}` as keyof Dict;
}

/** Rectangular map viewport, in degrees. */
export interface MapBounds {
  neLat: number;
  neLng: number;
  swLat: number;
  swLng: number;
}

/**
 * Great-circle distance between the NE and SW corners of the viewport.
 *
 * @param bounds - The viewport corners.
 * @returns Diagonal length in metres.
 */
export function diagonalFromBounds({ neLat, neLng, swLat, swLng }: MapBounds): number {
  const R = 6371000;
  const toRad = (d: number): number => (d * Math.PI) / 180;
  const dLat = toRad(neLat - swLat);
  const dLng = toRad(neLng - swLng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(swLat)) * Math.cos(toRad(neLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Computes a search radius from the map's visible diagonal so the API call
 * covers the camera frame without over-fetching.
 *
 * @param bounds - The viewport corners.
 * @returns Radius in metres, clamped between {@link MIN_SEARCH_RADIUS_M} and
 *   {@link API_MAX_RADIUS_M}.
 */
export function radiusFromBounds(bounds: MapBounds): number {
  const diag = diagonalFromBounds(bounds);
  return Math.max(MIN_SEARCH_RADIUS_M, Math.min(API_MAX_RADIUS_M, Math.round(diag / 2)));
}

/**
 * Tests whether a coordinate falls inside the viewport, with a soft margin so
 * a pin sitting exactly on the edge isn't culled by camera-debounce jitter.
 *
 * The API result is anchored to the *last* fetch center, so without this
 * filter a slightly stale list would draw pins belonging to the adjacent
 * neighbourhood.
 *
 * @param lat - Coordinate latitude (degrees).
 * @param lng - Coordinate longitude (degrees).
 * @param bounds - The viewport corners.
 * @param marginRatio - Fraction of the viewport span treated as a soft
 *   inclusion margin (default `0.05` ≈ 5 % on each side).
 * @returns `true` when the point lies inside the slightly inflated viewport.
 */
export function isInBounds(
  lat: number,
  lng: number,
  bounds: MapBounds,
  marginRatio = 0.05,
): boolean {
  const latMargin = (bounds.neLat - bounds.swLat) * marginRatio;
  const lngMargin = (bounds.neLng - bounds.swLng) * marginRatio;
  return (
    lat >= bounds.swLat - latMargin &&
    lat <= bounds.neLat + latMargin &&
    lng >= bounds.swLng - lngMargin &&
    lng <= bounds.neLng + lngMargin
  );
}

/**
 * Detects when the viewport is too wide to be covered by the API's 50 km
 * radius cap — past that point the search only samples the middle of the
 * screen, so the UI nudges the user to zoom in.
 *
 * @param bounds - The viewport corners.
 * @returns `true` when the viewport is wider than the API can cover.
 */
export function isZoomedTooFarOut(bounds: MapBounds): boolean {
  return diagonalFromBounds(bounds) > 2 * API_MAX_RADIUS_M * 1.1;
}
