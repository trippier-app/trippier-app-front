import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { backApiUrl, SESSION_COOKIE } from '@/lib/server/auth-session';

const UPSTREAM_TIMEOUT_MS = 15_000;

interface ForwardOptions {
  /** Refuse the call outright when no session cookie is present. */
  requireAuth?: boolean;
}

/**
 * Forwards a call to one of the app back-end's resources under the caller's
 * session.
 *
 * The browser holds the JWT in an httpOnly cookie it cannot read; this turns
 * it back into the Bearer header the back-end expects, so the token stays
 * server-side on both ends of the hop. Anonymous calls are let through when
 * the resource itself decides what an unauthenticated caller may see.
 *
 * @param request - The incoming request.
 * @param resource - Back-end resource, e.g. `follows`.
 * @param path - Path segments after the resource.
 * @param options - Whether a session is mandatory.
 * @returns The back-end's response, verbatim.
 */
export async function forwardToBack(
  request: Request,
  resource: string,
  path: string[],
  options: ForwardOptions = {},
): Promise<Response> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token && options.requireAuth) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }

  const baseUrl = backApiUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: 'BACK_API_URL is not configured' }, { status: 503 });
  }

  const suffix = path.length > 0 ? `/${path.map(encodeURIComponent).join('/')}` : '';
  const query = new URL(request.url).search;
  const headers: Record<string, string> = {};
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }
  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'DELETE') {
    body = await request.text();
    headers['content-type'] = 'application/json';
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/${resource}${suffix}${query}`, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: `${resource} service unreachable` }, { status: 503 });
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}
