/**
 * Client-side access to the follow graph, the country map and the shared-place
 * discovery, all through this app's own proxies so the JWT stays in the
 * httpOnly cookie. Shapes mirror the back-end's controllers.
 */

/** How a map may be seen, mirroring the back-end's MapVisibility. */
export type MapVisibility = 'PUBLIC' | 'FRIENDS' | 'SELECTED' | 'PRIVATE';

/** The two states a country can be flagged in. */
export type CountryVisit = 'WANT' | 'DONE';

export interface CountryStatus {
  countryCode: string;
  status: CountryVisit;
}

/** How many people put one country in each state. */
export interface CountryStats {
  countryCode: string;
  done: number;
  want: number;
}

export interface PublicUser {
  id: number;
  name: string | null;
}

export interface Relationship {
  following: boolean;
  followedBy: boolean;
  friends: boolean;
}

export interface SharedMap {
  id: number;
  title: string;
  icon: string | null;
  visibility: MapVisibility;
  pois: { id: string; name: string }[];
}

export interface SharedMatch {
  user: PublicUser;
  sharedPoiCount: number;
  maps: SharedMap[];
}

export interface PublicProfile {
  user: { id: number; name: string | null; createdAt: string };
  countries: CountryStatus[];
  maps: {
    id: number;
    title: string;
    icon: string | null;
    visibility: MapVisibility;
    poiCount: number;
  }[];
  relationship: Relationship | null;
}

/**
 * Issues a call against one of the social proxies.
 *
 * @param path - Full path under `/api`.
 * @param init - Fetch options; a body is serialised as JSON.
 * @returns The parsed response, or undefined when the body is empty.
 * @throws When the back-end refuses the call.
 */
async function call<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const response = await fetch(`/api${path}`, {
    ...rest,
    headers: json ? { 'content-type': 'application/json' } : undefined,
    body: json ? JSON.stringify(json) : undefined,
    cache: 'no-store',
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? `Request failed (${response.status})`);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/**
 * Reads the signed-in user's flagged countries.
 *
 * @returns Every country they marked, in either state.
 */
export function listCountries(): Promise<CountryStatus[]> {
  return call<CountryStatus[]>('/countries');
}

/**
 * Reads another user's flagged countries.
 *
 * @param userId - Whose countries to read.
 * @returns Their flagged countries.
 */
export function listCountriesOf(userId: number): Promise<CountryStatus[]> {
  return call<CountryStatus[]>(`/countries/user/${userId}`);
}

/**
 * Reads how many people flagged a country, in each state.
 *
 * @param code - ISO 3166-1 alpha-2 country code.
 * @returns The two counts.
 */
export function readCountryStats(code: string): Promise<CountryStats> {
  return call<CountryStats>(`/countries/stats/${code}`);
}

/**
 * Flags a country, replacing whatever state it held.
 *
 * @param code - ISO 3166-1 alpha-2 country code.
 * @param status - The state to move it to.
 * @returns The stored status.
 */
export function setCountry(code: string, status: CountryVisit): Promise<CountryStatus> {
  return call<CountryStatus>(`/countries/${code}`, { method: 'PUT', json: { status } });
}

/**
 * Clears a country's flag.
 *
 * @param code - ISO 3166-1 alpha-2 country code.
 */
export async function clearCountry(code: string): Promise<void> {
  await call<void>(`/countries/${code}`, { method: 'DELETE' });
}

/**
 * Lists the people the signed-in user follows.
 *
 * @returns The followed accounts.
 */
export function listFollowing(): Promise<PublicUser[]> {
  return call<PublicUser[]>('/follows/following');
}

/**
 * Lists the people following the signed-in user, which they always get to see.
 *
 * @returns The following accounts.
 */
export function listFollowers(): Promise<PublicUser[]> {
  return call<PublicUser[]>('/follows/followers');
}

/**
 * Follows a user.
 *
 * @param userId - Who to follow.
 * @returns The resulting relationship.
 */
export function follow(userId: number): Promise<Relationship> {
  return call<Relationship>(`/follows/${userId}`, { method: 'POST' });
}

/**
 * Stops following a user.
 *
 * @param userId - Who to drop.
 * @returns The resulting relationship.
 */
export function unfollow(userId: number): Promise<Relationship> {
  return call<Relationship>(`/follows/${userId}`, { method: 'DELETE' });
}

/**
 * Finds the people holding places the signed-in user also saved.
 *
 * @returns One entry per other user, richest overlap first.
 */
export function listSharedMatches(): Promise<SharedMatch[]> {
  return call<SharedMatch[]>('/discovery/shared');
}

/**
 * Reads another user's public page.
 *
 * @param userId - Whose page to read.
 * @returns Their countries and the maps the caller may see.
 */
export function readPublicProfile(userId: number): Promise<PublicProfile> {
  return call<PublicProfile>(`/discovery/users/${userId}`);
}
