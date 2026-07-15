import type { Metadata } from 'next'
import { getMessages, setRequestLocale } from 'next-intl/server'

import { marketingAlternates, siteUrl } from '@/lib/seo'
import { RootShell } from '../root-shell'
import { baseMetadata, baseViewport } from '../shared-metadata'

export const metadata: Metadata = {
    ...baseMetadata,
    metadataBase: new URL(siteUrl),
    alternates: marketingAlternates('/es'),
}
export const viewport = baseViewport

/**
 * Spanish marketing shell (`/es`). Mirror of the English shell with the locale fixed
 * to `es` at build time, so `/es` prerenders statically with EUR pricing.
 */
export default async function MarketingEsLayout({ children }: { children: React.ReactNode }) {
    setRequestLocale('es')
    const messages = await getMessages()

    return (
        <RootShell locale="es" messages={messages}>
            {children}
        </RootShell>
    )
}
