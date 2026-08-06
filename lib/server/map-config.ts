/**
 * Resolves the MapTiler style URL from the server environment.
 *
 * Read per request rather than inlined at build time, so the key lives in the
 * deployment's env alongside every other setting and rotating it needs no
 * rebuild. The URL still reaches the browser — a MapTiler key is a client
 * credential — but it is never baked into the published image.
 *
 * @returns The style URL, or null when the key or the map id is missing.
 */
export function mapStyleUrl(): string | null {
  const key = process.env.MAPTILER_API_KEY;
  const mapId = process.env.MAPTILER_MAP_ID;
  return key && mapId ? `https://api.maptiler.com/maps/${mapId}/style.json?key=${key}` : null;
}

/**
 * Resolves the tileset holding administrative polygons.
 *
 * The basemap's own tiles carry borders as lines only, so a country cannot be
 * filled from them. This is the same provider's polygon set, keyed by ISO
 * 3166-1 alpha-2, which is what makes a fill land on the border the basemap
 * already draws instead of near it.
 *
 * @returns The TileJSON URL, or null when the key is missing.
 */
export function countriesTilesUrl(): string | null {
  const key = process.env.MAPTILER_API_KEY;
  return key ? `https://api.maptiler.com/tiles/countries/tiles.json?key=${key}` : null;
}
