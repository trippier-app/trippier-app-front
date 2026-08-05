import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { backApiUrl, clearSession, SESSION_COOKIE } from '@/lib/server/auth-session';

const UPSTREAM_TIMEOUT_MS = 10_000;

/**
 * Resolves the signed-in user from the session cookie.
 *
 * A rejected token clears the cookie on the way out, so a stale session stops
 * costing a round trip on every load.
 *
 * @returns The user, or `{ user: null }` when signed out.
 */
export async function GET(): Promise<Response> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ user: null });
  }

  const baseUrl = backApiUrl();
  if (!baseUrl) {
    return NextResponse.json({ user: null });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${baseUrl}/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch {
    return NextResponse.json({ user: null });
  }

  if (upstream.status === 401 || upstream.status === 404) {
    return clearSession(NextResponse.json({ user: null }));
  }
  if (!upstream.ok) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user: await upstream.json() });
}

/**
 * Signs the user out by dropping the session cookie.
 *
 * @returns An empty acknowledgement.
 */
export async function DELETE(): Promise<Response> {
  return clearSession(NextResponse.json({ user: null }));
}
