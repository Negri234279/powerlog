import type { Metadata } from 'next'
import { getMessages, setRequestLocale } from 'next-intl/server'

import { marketingAlternates, siteUrl } from '@/lib/seo'
import { RootShell } from '../root-shell'
import { baseMetadata, baseViewport } from '../shared-metadata'

export const metadata: Metadata = {
    ...baseMetadata,
    metadataBase: new URL(siteUrl),
    alternates: marketingAlternates('/'),
}
export const viewport = baseViewport

/**
 * English marketing shell (`/`). The locale is fixed at build time via
 * `setRequestLocale`, so no cookie/header is read and the page renders statically —
 * a crawler and a cold visitor both get prerendered HTML. The Spanish landing lives
 * under `(marketing-es)/es`.
 */
export default async function MarketingEnLayout({ children }: { children: React.ReactNode }) {
    setRequestLocale('en')
    const messages = await getMessages()

    return (
        <RootShell locale="en" messages={messages}>
            {children}
        </RootShell>
    )
}
