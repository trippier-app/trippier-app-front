import { NextResponse } from 'next/server';

/** Name of the cookie carrying the app back-end's JWT. */
export const SESSION_COOKIE = 'trp_session';

/**
 * Lifetime of the session cookie, matching the back-end's own JWT expiry so
 * the browser stops sending a token the server would reject anyway.
 */
const SESSION_MAX_AGE_S = 7 * 24 * 60 * 60;

/**
 * Base URL of the app back-end, reachable server-side only.
 *
 * @returns The configured base URL, or null when unset.
 */
export function backApiUrl(): string | null {
  return process.env.BACK_API_URL ?? null;
}

/**
 * Attaches the session cookie to a response.
 *
 * The token stays httpOnly: the browser sends it on same-origin calls to this
 * app's own route handlers, and no script can read it, so an injected script
 * cannot walk off with a seven-day session.
 *
 * @param response - The response to decorate.
 * @param token - The JWT issued by the back-end.
 * @returns The same response, with the cookie set.
 */
export function withSession(response: NextResponse, token: string): NextResponse {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_S,
  });
  return response;
}

/**
 * Clears the session cookie.
 *
 * @param response - The response to decorate.
 * @returns The same response, with the cookie expired.
 */
export function clearSession(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
