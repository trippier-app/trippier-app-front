import type { EnrichedPoi, PoiProvider } from '@/lib/pois';

/**
 * A single back-to-source link displayed in the POI detail "Sources" section.
 * Computed from `EnrichedPoi.sources` (each entry already carries its
 * provider + canonical URL) so the screen doesn't need to know how to derive
 * URLs per provider. Kept aligned with the mobile app's
 * `src/screens/discover/poiSources.ts`.
 */
export interface PoiSourceLink {
  provider: PoiProvider;
  url: string;
}

/**
 * Human-readable label for each provider, used by the "Sources" section.
 * Falls back to a capitalised version of the provider id when missing.
 */
export const PROVIDER_LABELS: Partial<Record<PoiProvider, string>> = {
  overpass: 'OpenStreetMap',
  wikivoyage: 'Wikivoyage',
  wikipedia: 'Wikipedia',
  wikipedia_events: 'Wikipedia',
  geonames: 'GeoNames',
  foursquare: 'Foursquare',
  here: 'Here',
  ticketmaster: 'Ticketmaster',
  eventbrite: 'Eventbrite',
  meetup: 'Meetup',
  openagenda: 'OpenAgenda',
};

/**
 * Returns the display label for a provider, defaulting to the provider id
 * with the first character upper-cased when no explicit label is registered.
 *
 * @param provider - Provider identifier returned by the API.
 * @returns A short human-readable label.
 */
export function providerLabel(provider: PoiProvider): string {
  return PROVIDER_LABELS[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

/**
 * Extracts the list of back-to-source links from an EnrichedPoi by walking
 * its `sources` array. Order is preserved so the primary source stays first;
 * entries without a URL are silently dropped and each provider appears once.
 *
 * @param poi - Enriched POI returned by `/v1/pois/search`.
 * @returns An ordered list of source links suitable for the Sources section.
 */
export function buildSourceLinks(poi: EnrichedPoi): PoiSourceLink[] {
  if (!poi.sources) {
    return [];
  }
  const seen = new Set<PoiProvider>();
  const links: PoiSourceLink[] = [];
  for (const source of poi.sources) {
    if (!source?.url || seen.has(source.provider)) {
      continue;
    }
    links.push({ provider: source.provider, url: source.url });
    seen.add(source.provider);
  }
  return links;
}

/**
 * Returns the Wikidata ID associated with the POI.
 *
 * The current `/v1/pois/search` schema does not surface `wikidata_id` at the
 * `EnrichedPoi` top level. Until the backend exposes it again this helper
 * always returns undefined; the consumer (SourcesSection) skips the Wikidata
 * link when absent.
 *
 * @param _poi - Enriched POI (kept in the signature so reintroducing the
 *               field later is a one-line change).
 * @returns Always undefined for now.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept in the signature so reintroducing the field is a one-line change
export function extractWikidataId(_poi: EnrichedPoi): string | undefined {
  return undefined;
}

/**
 * Rewrites known-provider URLs to their mobile-friendly variants so the
 * embedded preview shows a layout designed for the narrow inline frame.
 * Wikipedia and Wikivoyage have first-party mobile subdomains
 * (`en.m.wikipedia.org`) that ship a much lighter, single-column layout. The
 * "Open in browser" affordance still points to the *original* canonical URL
 * so the user is never trapped on the mobile subdomain.
 *
 * @param url - The canonical source URL coming from the API.
 * @returns A URL suitable for the inline preview.
 */
export function toPreviewUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (
      (parsed.hostname.endsWith('.wikipedia.org') || parsed.hostname.endsWith('.wikivoyage.org')) &&
      !parsed.hostname.startsWith('m.') &&
      !parsed.hostname.includes('.m.')
    ) {
      const [lang, ...rest] = parsed.hostname.split('.');
      parsed.hostname = [lang, 'm', ...rest].join('.');
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
}
