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
  /**
   * Identity of the place rather than of the record. `id` belongs to whichever
   * provider won the merge, so it changes when a better-ranked provider joins
   * — visible while streaming, where a place is sent once before that provider
   * lands and again after. Key on this.
   */
  stable_id?: string;
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
  /**
   * True when the upstream merge was partial (`X-Merge-Partial` header): at
   * least one provider timed out, so a thin or empty result does not mean
   * the area is actually empty.
   */
  partial?: boolean;
}

/** One revision of a streamed search: the whole result as it then stood. */
export interface SearchFrame {
  frame: number;
  partial: boolean;
  /** Providers still being awaited. */
  pending: string[];
  /** Providers that gave up, so a thin result is explainable. */
  failed: string[];
  total: number;
  results: EnrichedPoi[];
}

/**
 * Identity to key a place on, preferring the one that survives a merge.
 *
 * @param poi - The place.
 * @returns Its stable identity, falling back to the record id.
 */
export function poiKey(poi: Pick<EnrichedPoi, 'id' | 'stable_id'>): string {
  return poi.stable_id || poi.id;
}

/**
 * Runs a search as a stream, handing each revision of the result to `onFrame`
 * as the API sends it.
 *
 * Fast providers answer in under a second and slow ones take twenty; a single
 * response has to cut somewhere, and it always cut before the slow ones. Here
 * the first frame paints straight away and later frames revise it in place.
 *
 * @param params - Search parameters (`lat` / `lng` required).
 * @param onFrame - Called for every revision, in order.
 * @param signal - Aborts the stream when the caller moves on.
 * @throws When the proxy or the upstream API refuses the request.
 */
export async function streamPois(
  params: RadiusSearchParams,
  onFrame: (frame: SearchFrame) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`/api/pois?${toQuery(params)}&stream=true`, { signal });
  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `POI search failed (${response.status})`);
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += value;
    // A read can land mid-line, so only whole lines are parsed and the
    // remainder waits for the next chunk.
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }
      onFrame(JSON.parse(line) as SearchFrame);
    }
  }
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
  const result = (await response.json()) as SearchResult;
  result.partial = response.headers.get('x-merge-partial') !== null;
  return result;
}
