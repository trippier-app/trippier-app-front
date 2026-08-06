import { NextResponse } from 'next/server';
import { backApiUrl, withSession } from '@/lib/server/auth-session';

/** Credential endpoints this proxy is allowed to forward to the back-end. */
const ALLOWED = new Set(['login', 'register', 'verify', 'resend']);

/** The subset of those that answer with a token, and so open a session. */
const SIGNS_IN = new Set(['login', 'verify']);

const UPSTREAM_TIMEOUT_MS = 10_000;

interface AuthPayload {
  access_token?: string;
  user?: unknown;
  status?: string;
  email?: string;
  message?: string | string[];
}

/**
 * Proxies a credential exchange to the app back-end and, when it answers with
 * a JWT, turns that into an httpOnly cookie.
 *
 * The token never reaches the browser as readable data: the client only gets
 * the user record, and every later authenticated call rides the cookie.
 *
 * Registering no longer signs anyone in — it opens an unconfirmed account and
 * mails a code — so `register` and `resend` come back with the address still
 * awaiting confirmation and no cookie is set. A login refused because the
 * address was never confirmed is tagged `verification_required`, so the client
 * can send the user to the code step instead of reading it as a bad password.
 *
 * @param request - The incoming credentials.
 * @param context - Route parameters carrying the action segment.
 * @returns The user, the pending address, or the back-end's error.
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

  if (!upstream.ok) {
    const message = Array.isArray(payload?.message) ? payload.message[0] : payload?.message;
    return NextResponse.json(
      {
        error: message ?? 'authentication failed',
        ...(action === 'login' && upstream.status === 403 ? { code: 'verification_required' } : {}),
      },
      { status: upstream.status },
    );
  }

  if (!SIGNS_IN.has(action)) {
    return NextResponse.json({ status: 'verification_required', email: payload?.email });
  }

  if (!payload?.access_token) {
    return NextResponse.json({ error: 'authentication failed' }, { status: 502 });
  }

  return withSession(NextResponse.json({ user: payload.user }), payload.access_token);
}
