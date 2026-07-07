/**
 * Supported UI/content locales. `en` is the default and the fallback for any
 * missing translation (exercise names live in `exercises.name` as English, with
 * `exercise_translations` holding the rest). Kept tiny on purpose — add a locale
 * here and seed its translations to support it everywhere.
 */
export const SUPPORTED_LOCALES = ['en', 'es'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

export const DEFAULT_LOCALE: SupportedLocale = 'en'

/**
 * Normalise any BCP-47 tag (or null/undefined) to a supported base locale,
 * defaulting to `en`. `es-ES` → `es`, `EN` → `en`, `fr` / null → `en`.
 */
export function toSupportedLocale(raw?: string | null): SupportedLocale {
    if (!raw) return DEFAULT_LOCALE

    const base = raw.toLowerCase().split('-')[0] ?? ''
    return (SUPPORTED_LOCALES as readonly string[]).includes(base) ? (base as SupportedLocale) : DEFAULT_LOCALE
}
