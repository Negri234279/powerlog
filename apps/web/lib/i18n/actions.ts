'use server'

import { cookies } from 'next/headers'

import { LOCALE_COOKIE, type Locale, toLocale } from './config'

/**
 * Persist the user's explicit locale choice in the `NEXT_LOCALE` cookie so it
 * wins on the next request (see `resolveLocale`). One year, lax, site-wide. The
 * caller also persists it to the DB profile when signed in; this cookie is what
 * makes the switch take effect immediately.
 */
export async function setLocaleCookie(locale: Locale): Promise<void> {
    const store = await cookies()
    store.set(LOCALE_COOKIE, toLocale(locale), {
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
        sameSite: 'lax',
    })
}
