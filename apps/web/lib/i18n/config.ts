/**
 * Supported UI locales for the web. Mirrors the API's `shared/i18n/locale.ts`
 * (English default, English fallback). `en` is the floor; `es` is the only other
 * locale today. Add one here + a `messages/<locale>.json` + API translations.
 */
export const SUPPORTED_LOCALES = ['en', 'es'] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'en'

/** Cookie that carries the user's explicit locale choice (next-intl convention). */
export const LOCALE_COOKIE = 'NEXT_LOCALE'

/** Human labels for the switcher, in each locale's own language. */
export const LOCALE_LABELS: Record<Locale, string> = {
    en: 'English',
    es: 'Español',
}

/** Normalise any BCP-47 tag (or null/undefined) to a supported base locale. */
export function toLocale(raw?: string | null): Locale {
    if (!raw) return DEFAULT_LOCALE

    const base = raw.toLowerCase().split('-')[0] ?? ''
    return (SUPPORTED_LOCALES as readonly string[]).includes(base) ? (base as Locale) : DEFAULT_LOCALE
}
