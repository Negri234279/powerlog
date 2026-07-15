import type { Metadata } from 'next'
import { getLocale, getMessages } from 'next-intl/server'

import { toLocale } from '@/lib/i18n/config'
import { RootShell } from '../root-shell'
import { baseMetadata, baseViewport } from '../shared-metadata'

// The authenticated app and the auth funnel are not indexable surfaces: dashboards
// are private and the login/register pages are thin duplicates of the marketing
// funnel. They stay crawlable (robots.txt only blocks /api) so this noindex is
// actually read; the indexable surface is the marketing home alone.
export const metadata: Metadata = {
    ...baseMetadata,
    robots: { index: false, follow: true },
}
export const viewport = baseViewport

/**
 * Root layout for the authenticated app and the auth forms. Locale is resolved per
 * request (cookie → session → Accept-Language → en), which reads cookies/headers and
 * so opts this subtree into dynamic rendering — the right trade-off here, where the
 * pages are personalised and behind auth anyway. The marketing shells take the
 * opposite path (a build-time locale, statically rendered).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const locale = await getLocale()
    const messages = await getMessages()

    return (
        <RootShell locale={toLocale(locale)} messages={messages}>
            {children}
        </RootShell>
    )
}
