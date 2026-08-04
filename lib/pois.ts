/**
 * Client-side access to the public POI API. Every call goes through the Next
 * route handler at `/api/pois`, which holds the credential — nothing here is
 * authenticated, and nothing here may be.
 *
 * Types mirror `/v1/pois/search` and are kept aligned with the mobile app's
 * `src/api/pois.ts`.
 */

/**
 * POI category, aligned with the public `/v1/pois/search` taxonomy.
 *
 * The empty string is not a documented tag but the API does return it: a
 * result the providers could not categorise comes back with `type: ""`, not
 * `"generic"` — filtering on `generic` matches nothing.
 */
export type PoiType = 'see' | 'eat' | 'drink' | 'do' | 'buy' | 'sleep' | 'generic' | 'event' | '';

/** Class of a result — a place versus a time-bound event. */
export type PointKind = 'poi' | 'event';

/** Identifier of a data source the public API merges from. */
export type PoiProvider =
  | 'overpass'
  | 'wikivoyage'
  | 'wikipedia'
  | 'wikipedia_events'
  | 'geonames'
  | 'foursquare'
  | 'here'
  | 'ticketmaster'
  | 'eventbrite'
  | 'meetup'
  | 'openagenda';

export interface PoiCoordinates {
  lat: number;
  lng: number;
  approximate: boolean;
}

export interface PoiZone {
  name: string;
  source: PoiProvider;
}

export interface PoiContact {
  website?: string;
  phone?: string;
  email?: string;
  opening_hours?: string;
}

/** One contributing source, with the canonical URL for richer detail. */
export interface SourceLink {
  provider: PoiProvider;
  url?: string;
}

/** Final merged + scored POI returned by `/v1/pois/search`. */
export interface EnrichedPoi {
  id: string;
  name: string;
  kind?: PointKind;
  type: PoiType;
  score: number;
  coords?: PoiCoordinates;
  zone?: PoiZone;
  distance: number;
  description?: string;
  contact?: PoiContact;
  thumbnail?: string;
  images?: string[];
  sources: SourceLink[];
}

/** Top-level body of `/v1/pois/search`. */
export interface SearchResult {
  total: number;
  results: EnrichedPoi[];
}

/** Parameters accepted by the radius search endpoints. */
export interface RadiusSearchParams {
  lat: number;
  lng: number;
  radius?: number;
  types?: PoiType[];
  limit?: number;
  offset?: number;
}

/**
 * Flattens search parameters into the query string the API expects, dropping
 * anything the caller left undefined.
 *
 * `types` is repeated once per value: the handler binds it into a `[]PoiType`
 * with gin's `form:"types"`, which reads repeated parameters. A comma-joined
 * list binds as one bogus category and silently matches nothing.
 *
 * @param params - The search parameters.
 * @returns The query string, ready to append to `/api/pois`.
 */
function toQuery(params: RadiusSearchParams): string {
  const query = new URLSearchParams({
    subpath: 'search',
    lat: String(params.lat),
    lng: String(params.lng),
  });
  if (params.radius !== undefined) {
    query.set('radius', String(params.radius));
  }
  if (params.limit !== undefined) {
    query.set('limit', String(params.limit));
  }
  if (params.offset !== undefined) {
    query.set('offset', String(params.offset));
  }
  for (const type of params.types ?? []) {
    query.append('types', type);
  }
  return query.toString();
}

/**
 * Issues a POI search around a coordinate.
 *
 * @param params - Search parameters (`lat` / `lng` required).
 * @param signal - Optional `AbortSignal`, so a stale request can be dropped
 *   when the camera moves again before the response lands.
 * @returns The enriched search result.
 * @throws When the proxy or the upstream API returns a non-2xx status.
 */
export async function searchPois(
  params: RadiusSearchParams,
  signal?: AbortSignal,
): Promise<SearchResult> {
  const response = await fetch(`/api/pois?${toQuery(params)}`, { signal });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `POI search failed (${response.status})`);
  }
  return (await response.json()) as SearchResult;
}
