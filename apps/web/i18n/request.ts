import { getRequestConfig } from 'next-intl/server'

import { toLocale } from '@/lib/i18n/config'
import { resolveLocale } from '@/lib/i18n/resolve-locale'

/**
 * Per-request next-intl config (no URL-based routing). Two callers, two paths:
 *
 * - **Marketing shells** declare their locale up front with `setRequestLocale`,
 *   which arrives here as `requestLocale`. Using it means we never read a cookie or
 *   header, so `/` and `/es` render statically.
 * - **The app shell** declares nothing, so `requestLocale` is undefined and we fall
 *   back to `resolveLocale()` (cookie → session → Accept-Language → en) — the
 *   personalised, per-request resolution the authenticated app needs.
 */
export default getRequestConfig(async ({ requestLocale }) => {
    const declared = await requestLocale
    const locale = declared ? toLocale(declared) : await resolveLocale()
    const messages = (await import(`../messages/${locale}.json`)).default

    return { locale, messages }
})
