/**
 * Client-side access to the app back-end's accounts, always through this
 * app's own `/api/auth/*` route handlers: the JWT lives in an httpOnly
 * cookie the browser attaches on its own, and never reaches this code.
 */

export interface AuthUser {
  id: number | string;
  email: string;
  name?: string | null;
  role?: string;
}

interface AuthResponse {
  user?: AuthUser | null;
  error?: string;
}

/**
 * Posts credentials to a credential endpoint.
 *
 * @param action - Either `login` or `register`.
 * @param body - Credentials accepted by the back-end.
 * @returns The signed-in user.
 * @throws When the back-end rejects the credentials or is unreachable.
 */
async function exchange(
  action: 'login' | 'register',
  body: Record<string, string>,
): Promise<AuthUser> {
  const response = await fetch(`/api/auth/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as AuthResponse | null;
  if (!response.ok || !payload?.user) {
    throw new Error(payload?.error ?? `Authentication failed (${response.status})`);
  }
  return payload.user;
}

/**
 * Signs in with an existing account.
 *
 * @param email - Account email.
 * @param password - Account password.
 * @returns The signed-in user.
 */
export function login(email: string, password: string): Promise<AuthUser> {
  return exchange('login', { email, password });
}

/**
 * Creates an account and signs in with it.
 *
 * @param email - Account email.
 * @param password - Chosen password, at least six characters.
 * @param name - Optional display name.
 * @returns The newly created user.
 */
export function register(email: string, password: string, name?: string): Promise<AuthUser> {
  return exchange('register', name ? { email, password, name } : { email, password });
}

/**
 * Reads the user backing the current session.
 *
 * @returns The user, or null when signed out.
 */
export async function currentUser(): Promise<AuthUser | null> {
  const response = await fetch('/api/auth/me', { cache: 'no-store' });
  if (!response.ok) {
    return null;
  }
  const payload = (await response.json().catch(() => null)) as AuthResponse | null;
  return payload?.user ?? null;
}

/** Drops the session cookie. */
export async function logout(): Promise<void> {
  await fetch('/api/auth/me', { method: 'DELETE' });
}
