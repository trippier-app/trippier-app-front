import { ar } from './ar';
import { de } from './de';
import { en } from './en';
import { es } from './es';
import { fr, type Dict } from './fr';
import { it } from './it';
import { ja } from './ja';
import { zh } from './zh';

/** Supported locale codes (fr is the default and the translation source of truth). */
export const LOCALES = ['fr', 'en', 'es', 'zh', 'ar', 'ja', 'de', 'it'] as const;
export type Locale = (typeof LOCALES)[number];

/** Display names shown in the language selector. */
export const LANGUAGE_NAMES: Record<Locale, string> = {
  fr: 'Français',
  en: 'English',
  es: 'Español',
  zh: '中文',
  ar: 'العربية',
  ja: '日本語',
  de: 'Deutsch',
  it: 'Italiano',
};

/** Right-to-left locales. */
export const RTL_LOCALES = new Set<Locale>(['ar']);

export const DEFAULT_LOCALE: Locale = 'fr';

export const STORAGE_KEY = 'trp_locale';

const dicts: Record<Locale, Dict> = { fr, en, es, zh, ar, ja, de, it };

/** Signature of the translation function handed to components. */
export type TranslateFn = (key: keyof Dict, vars?: Record<string, string | number>) => string;

/**
 * Type guard for a supported locale code.
 *
 * @param value - Candidate string, possibly null.
 * @returns Whether the value is a supported locale.
 */
export function isLocale(value: string | null | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/**
 * Picks the best supported locale for a list of browser language tags.
 *
 * @param languages - Tags in preference order, e.g. `navigator.languages`.
 * @returns The first supported locale, or {@link DEFAULT_LOCALE}.
 */
export function matchLocale(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLocale(base)) {
      return base;
    }
  }
  return DEFAULT_LOCALE;
}

/**
 * Builds the translation function for a locale, falling back to French and
 * then to the key itself, interpolating `{placeholders}`.
 *
 * @param locale - The active locale.
 * @returns A translation function bound to that locale's dictionary.
 */
export function translator(locale: Locale): TranslateFn {
  const dict = dicts[locale] ?? fr;
  return (key, vars) => {
    let str: string = dict[key] ?? fr[key] ?? key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        str = str.replaceAll(`{${name}}`, String(value));
      }
    }
    return str;
  };
}

export type { Dict };
