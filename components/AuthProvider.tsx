'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as auth from '@/lib/auth';
import type { AuthUser } from '@/lib/auth';

interface AuthValue {
  user: AuthUser | null;
  /** True until the session cookie has been resolved once. */
  pending: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Opens an account and has its code mailed; signs nobody in on its own. */
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  /** Confirms an address with its mailed code, which signs the account in. */
  verify: (email: string, code: string) => Promise<void>;
  /** Mails a fresh code to an address still awaiting confirmation. */
  resend: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * Holds the signed-in user for the whole app.
 *
 * The session itself is a cookie the browser owns, so this only mirrors it:
 * one call on mount resolves who is signed in, and the credential calls
 * refresh that mirror.
 *
 * @param props - The subtree that gets access to the session.
 * @returns The provider.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    auth
      .currentUser()
      .then(resolved => {
        if (!cancelled) {
          setUser(resolved);
          setPending(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPending(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setUser(await auth.login(email, password));
  }, []);

  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    await auth.register(email, password, name);
  }, []);

  const verify = useCallback(async (email: string, code: string) => {
    setUser(await auth.verifyCode(email, code));
  }, []);

  const resend = useCallback(async (email: string) => {
    await auth.resendCode(email);
  }, []);

  const signOut = useCallback(async () => {
    await auth.logout();
    setUser(null);
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ user, pending, signIn, signUp, verify, resend, signOut }),
    [user, pending, signIn, signUp, verify, resend, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Reads the auth context.
 *
 * @returns The session mirror and its actions.
 */
export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return value;
}
