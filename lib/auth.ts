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
  verified?: boolean;
  createdAt?: string;
}

/** An address that exists but still has to be confirmed with a mailed code. */
export interface PendingVerification {
  status: 'verification_required';
  email: string;
}

interface AuthResponse {
  user?: AuthUser | null;
  status?: string;
  email?: string;
  error?: string;
  code?: string;
}

/**
 * A credential exchange the back-end refused.
 *
 * Carries `verification_required` when the account exists but its address was
 * never confirmed, which is a step to take rather than a failure to report.
 */
export class AuthError extends Error {
  readonly code?: 'verification_required';

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code === 'verification_required' ? 'verification_required' : undefined;
  }
}

/**
 * Posts to a credential endpoint and unwraps its answer.
 *
 * @param action - The endpoint segment under `/api/auth`.
 * @param body - Payload accepted by the back-end.
 * @returns The parsed response body.
 * @throws AuthError When the back-end rejects the exchange.
 */
async function exchange(action: string, body: Record<string, string>): Promise<AuthResponse> {
  const response = await fetch(`/api/auth/${action}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as AuthResponse | null;
  if (!response.ok) {
    throw new AuthError(
      payload?.error ?? `Authentication failed (${response.status})`,
      payload?.code,
    );
  }
  return payload ?? {};
}

/**
 * Signs in with an existing account.
 *
 * @param email - Account email.
 * @param password - Account password.
 * @returns The signed-in user.
 * @throws AuthError Tagged `verification_required` when the address was never
 *   confirmed, so the caller can offer the code step instead of an error.
 */
export async function login(email: string, password: string): Promise<AuthUser> {
  const payload = await exchange('login', { email, password });
  if (!payload.user) {
    throw new AuthError('Authentication failed');
  }
  return payload.user;
}

/**
 * Opens an account. It cannot be used until {@link verifyCode} confirms the
 * address with the code the back-end mails out.
 *
 * @param email - Address to register.
 * @param password - Chosen password, at least six characters.
 * @param name - Optional display name.
 * @returns The address now awaiting its code.
 */
export async function register(
  email: string,
  password: string,
  name?: string,
): Promise<PendingVerification> {
  await exchange('register', name ? { email, password, name } : { email, password });
  return { status: 'verification_required', email };
}

/**
 * Confirms an address with the code mailed to it, which also signs the
 * account in.
 *
 * @param email - Address being confirmed.
 * @param code - The six digits from the email.
 * @returns The now signed-in user.
 */
export async function verifyCode(email: string, code: string): Promise<AuthUser> {
  const payload = await exchange('verify', { email, code });
  if (!payload.user) {
    throw new AuthError('Authentication failed');
  }
  return payload.user;
}

/**
 * Asks for a fresh code on an address still awaiting confirmation.
 *
 * @param email - Address to mail again.
 * @returns The address still awaiting its code.
 */
export async function resendCode(email: string): Promise<PendingVerification> {
  await exchange('resend', { email });
  return { status: 'verification_required', email };
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
