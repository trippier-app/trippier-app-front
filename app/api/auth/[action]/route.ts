import { NextResponse } from 'next/server';
import { backApiUrl, withSession } from '@/lib/server/auth-session';

/** Credential endpoints this proxy is allowed to forward to the back-end. */
const ALLOWED = new Set(['login', 'register']);

const UPSTREAM_TIMEOUT_MS = 10_000;

interface AuthPayload {
  access_token?: string;
  user?: unknown;
  message?: string | string[];
}

/**
 * Proxies a credential exchange to the app back-end and turns the JWT it
 * returns into an httpOnly cookie.
 *
 * The token never reaches the browser as readable data: the client only gets
 * the user record, and every later authenticated call rides the cookie.
 *
 * @param request - The incoming credentials.
 * @param context - Route parameters carrying the action segment.
 * @returns The user on success, or the back-end's error.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
): Promise<Response> {
  const { action } = await context.params;
  if (!ALLOWED.has(action)) {
    return NextResponse.json({ error: 'unknown action' }, { status: 404 });
  }

  const baseUrl = backApiUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: 'BACK_API_URL is not configured' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/auth/${action}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ error: 'auth service unreachable' }, { status: 503 });
  }

  const payload = (await upstream.json().catch(() => null)) as AuthPayload | null;
  if (!upstream.ok || !payload?.access_token) {
    const message = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
    return NextResponse.json(
      { error: message ?? 'authentication failed' },
      { status: upstream.status === 200 ? 502 : upstream.status },
    );
  }

  return withSession(NextResponse.json({ user: payload.user }), payload.access_token);
}
