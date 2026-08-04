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
