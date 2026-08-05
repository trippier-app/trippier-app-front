/**
 * Client-side access to the user's maps, through this app's `/api/maps`
 * proxy so the session cookie carries the identity and the JWT never reaches
 * this code. Shapes mirror the back-end's `/maps` controller.
 */

import { poiKey, type EnrichedPoi } from '@/lib/pois';

/** One saved place, as the back-end returns it inside a map. */
export interface SavedPoi {
  place_id: string;
  name: string;
  lat: number;
  lng: number;
  thumbnail?: string | null;
  category?: string | null;
  personalDescription?: string | null;
}

/** A user's map: a titled collection of saved places. */
export interface UserMap {
  id: number;
  title: string;
  icon?: string | null;
  description?: string | null;
  isPublic: boolean;
  isVisible: boolean;
  pois: SavedPoi[];
}

/**
 * Issues a call against the maps proxy.
 *
 * @param path - Path after `/api/maps`.
 * @param init - Fetch options; a body is serialised as JSON.
 * @returns The parsed response.
 * @throws When the back-end refuses the call.
 */
async function call<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const response = await fetch(`/api/maps${path}`, {
    ...rest,
    headers: json ? { 'content-type': 'application/json' } : undefined,
    body: json ? JSON.stringify(json) : undefined,
    cache: 'no-store',
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? `Maps request failed (${response.status})`);
  }
  return (await response.json()) as T;
}

/**
 * Lists the signed-in user's maps.
 *
 * @returns Every map the user owns, with its saved places.
 */
export function listMaps(): Promise<UserMap[]> {
  return call<UserMap[]>('');
}

/**
 * Creates a map.
 *
 * @param title - Name the user gave it.
 * @param icon - Optional emoji standing for the map.
 * @returns The created map.
 */
export function createMap(title: string, icon?: string): Promise<UserMap> {
  return call<UserMap>('', { method: 'POST', json: icon ? { title, icon } : { title } });
}

/**
 * Deletes a map and everything saved in it.
 *
 * @param mapId - The map to delete.
 */
export async function deleteMap(mapId: number): Promise<void> {
  await call<unknown>(`/${mapId}`, { method: 'DELETE' });
}

/**
 * Saves a place into a map.
 *
 * The back-end upserts the place itself, so the whole record travels: a place
 * saved from a thin search still gains its description and thumbnail the day
 * a richer search saves it again — which only works because the reference is
 * the stable identity, not the id of whichever provider won that day's merge.
 *
 * @param mapId - Target map.
 * @param poi - The place as the POI API returned it.
 * @returns The updated map.
 */
export function addPoiToMap(mapId: number, poi: EnrichedPoi): Promise<UserMap> {
  return call<UserMap>(`/${mapId}/pois`, {
    method: 'POST',
    json: {
      place_id: poiKey(poi),
      name: poi.name,
      lat: poi.coords?.lat ?? 0,
      lng: poi.coords?.lng ?? 0,
      category: poi.type || undefined,
      thumbnail: poi.thumbnail,
      description: poi.description,
      website: poi.contact?.website,
      phoneNumber: poi.contact?.phone,
    },
  });
}

/**
 * Removes a place from a map.
 *
 * @param mapId - The map holding it.
 * @param poiId - Identifier of the saved place.
 */
export async function removePoiFromMap(mapId: number, poiId: string): Promise<void> {
  await call<unknown>(`/${mapId}/pois/${encodeURIComponent(poiId)}`, { method: 'DELETE' });
}
