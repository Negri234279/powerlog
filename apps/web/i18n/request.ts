import { getRequestConfig } from 'next-intl/server'

import { resolveLocale } from '@/lib/i18n/resolve-locale'

/**
 * Per-request next-intl config (no URL-based routing). The locale is resolved
 * server-side from the cookie → session (DB) → Accept-Language → English, and the
 * matching message bundle is loaded. `<html lang>` and all `useTranslations`
 * calls read from here.
 */
export default getRequestConfig(async () => {
    const locale = await resolveLocale()
    const messages = (await import(`../messages/${locale}.json`)).default

    return { locale, messages }
})
