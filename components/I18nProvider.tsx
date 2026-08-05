'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import {
  DEFAULT_LOCALE,
  isLocale,
  matchLocale,
  RTL_LOCALES,
  STORAGE_KEY,
  translator,
  type Locale,
  type TranslateFn,
} from '@/lib/i18n';

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslateFn;
}

const I18nContext = createContext<I18nValue | null>(null);

let current: Locale | null = null;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot(): Locale {
  if (current === null) {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    current = isLocale(stored) ? stored : matchLocale(navigator.languages ?? []);
  }
  return current;
}

function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

function store(next: Locale): void {
  current = next;
  window.localStorage.setItem(STORAGE_KEY, next);
  listeners.forEach(listener => listener());
}

/**
 * Holds the active locale and exposes the bound translation function.
 *
 * The server cannot know the visitor's choice, so it renders
 * {@link DEFAULT_LOCALE} and the stored — or browser-negotiated — locale is
 * swapped in right after hydration. Resolving it during the first render
 * instead would make the server and client markup disagree.
 *
 * @param props - The subtree that gets access to the translations.
 * @returns The provider.
 */
export default function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
  }, [locale]);

  const setLocale = useCallback((next: Locale) => store(next), []);

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t: translator(locale) }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * Reads the i18n context.
 *
 * @returns The active locale, its setter and the translation function.
 */
export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error('useI18n must be used inside an I18nProvider');
  }
  return value;
}

/**
 * Shorthand for the translation function alone.
 *
 * @returns The translation function bound to the active locale.
 */
export function useT(): TranslateFn {
  return useI18n().t;
}
