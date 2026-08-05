import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { backApiUrl, SESSION_COOKIE } from '@/lib/server/auth-session';

const UPSTREAM_TIMEOUT_MS = 15_000;

/**
 * Forwards a maps call to the app back-end under the caller's session.
 *
 * The browser holds the JWT in an httpOnly cookie it cannot read; this turns
 * it back into the Bearer header the back-end expects, so the token stays
 * server-side on both ends of the hop.
 *
 * @param request - The incoming request.
 * @param path - Path segments after `/api/maps`.
 * @returns The back-end's response, verbatim.
 */
async function forward(request: Request, path: string[]): Promise<Response> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 });
  }

  const baseUrl = backApiUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: 'BACK_API_URL is not configured' }, { status: 503 });
  }

  // Segments arrive decoded, and a POI id carries slashes of its own
  // ("wikivoyage:Barcelona/Eixample:…"). Re-encoding each one keeps those
  // inside a single segment instead of forging extra path levels the
  // back-end would not recognise.
  const suffix = path.length > 0 ? `/${path.map(encodeURIComponent).join('/')}` : '';
  const query = new URL(request.url).search;
  const headers: Record<string, string> = { authorization: `Bearer ${token}` };
  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'DELETE') {
    body = await request.text();
    headers['content-type'] = 'application/json';
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/maps${suffix}${query}`, {
      method: request.method,
      headers,
      body,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'maps service unreachable' }, { status: 503 });
  }

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}

type Context = { params: Promise<{ path?: string[] }> };

export async function GET(request: Request, context: Context): Promise<Response> {
  return forward(request, (await context.params).path ?? []);
}

export async function POST(request: Request, context: Context): Promise<Response> {
  return forward(request, (await context.params).path ?? []);
}

export async function PATCH(request: Request, context: Context): Promise<Response> {
  return forward(request, (await context.params).path ?? []);
}

export async function DELETE(request: Request, context: Context): Promise<Response> {
  return forward(request, (await context.params).path ?? []);
}
