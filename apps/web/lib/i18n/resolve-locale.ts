import 'server-only'

import { cookies, headers } from 'next/headers'

import { getSession } from '@/lib/auth/session'
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale, toLocale } from './config'

/**
 * Resolve the active locale for the current request, in priority order:
 *
 *   1. `NEXT_LOCALE` cookie — the user's explicit choice (set by the switcher).
 *   2. The session's locale — the saved preference from the DB profile, carried
 *      in the access-token claim (so no network call). This is the "DB first"
 *      rule: a logged-in user with no cookie yet gets their saved preference.
 *   3. The browser's `Accept-Language`.
 *   4. English.
 *
 * The cookie sits above the session because the switcher writes both the cookie
 * and the DB, so an explicit in-app choice takes effect instantly; a fresh device
 * (no cookie) still falls back to the saved DB preference.
 */
export async function resolveLocale(): Promise<Locale> {
    const cookie = (await cookies()).get(LOCALE_COOKIE)?.value
    if (cookie) return toLocale(cookie)

    const session = await getSession()
    if (session?.locale) return toLocale(session.locale)

    const acceptLanguage = (await headers()).get('accept-language')
    if (acceptLanguage) return toLocale(acceptLanguage.split(',')[0])

    return DEFAULT_LOCALE
}
