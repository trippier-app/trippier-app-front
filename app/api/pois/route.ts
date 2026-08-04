import { NextResponse } from 'next/server';
import { buildInternalAuth } from '@/lib/server/internal-auth';

/**
 * Public API subpaths the browser is allowed to reach through this proxy.
 * Mirrors the landing page's allowlist so both surfaces expose the same
 * surface area of `/v1/pois/*`.
 */
const ALLOWED_SUBPATHS = new Set([
  'search',
  'search/slim',
  'search/custom',
  'search/custom/slim',
  'events',
  'events/slim',
  'events/custom',
  'events/custom/slim',
  'providers',
  'providers/catalog',
  'providers/recommend',
]);

const UPSTREAM_TIMEOUT_MS = 15_000;

/**
 * Builds the auth headers for an upstream POI API call.
 *
 * `INTERNAL_SECRET` takes precedence: it is the trusted service-to-service
 * path and bypasses per-key rate limiting. `POI_API_KEY` is the fallback for
 * deployments that talk to the API as a regular consumer. Either way the
 * credential stays on the server — the browser only ever sees `/api/pois`.
 *
 * @returns The headers to forward upstream.
 */
function buildAuthHeaders(): Record<string, string> {
  const secret = process.env.INTERNAL_SECRET;
  if (secret) {
    return { 'X-Internal-Auth': buildInternalAuth(secret) };
  }
  const apiKey = process.env.POI_API_KEY;
  return apiKey ? { 'X-API-Key': apiKey } : {};
}

/**
 * Proxies POI searches to the public API, keeping credentials server-side.
 *
 * The caller passes the target endpoint as `?subpath=` (default `search`) plus
 * whatever query the endpoint accepts (`lat`, `lng`, `radius`, `limit`,
 * `types`, …); everything else is forwarded verbatim.
 *
 * @param request - The incoming request.
 * @returns The upstream response, or a JSON error when it is unreachable.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const subpath = url.searchParams.get('subpath') ?? 'search';
  if (!ALLOWED_SUBPATHS.has(subpath)) {
    return NextResponse.json({ error: 'invalid subpath' }, { status: 400 });
  }

  const baseUrl = process.env.POI_API_URL;
  if (!baseUrl) {
    return NextResponse.json({ error: 'POI_API_URL is not configured' }, { status: 503 });
  }

  const query = new URLSearchParams(url.searchParams);
  query.delete('subpath');

  try {
    const upstream = await fetch(`${baseUrl}/v1/pois/${subpath}?${query}`, {
      headers: buildAuthHeaders(),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: 'no-store',
    });
    const body = await upstream.text();
    const headers: Record<string, string> = {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
    };
    // Forwarded so the client can tell a genuinely empty area from a merge
    // where one or more providers timed out.
    const mergePartial = upstream.headers.get('x-merge-partial');
    if (mergePartial) {
      headers['x-merge-partial'] = mergePartial;
    }
    return new Response(body, { status: upstream.status, headers });
  } catch {
    return NextResponse.json({ error: 'POI API unreachable' }, { status: 503 });
  }
}
