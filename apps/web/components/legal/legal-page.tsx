import type { ReactNode } from 'react'

import type { Locale } from '@/lib/i18n/config'
import { SiteFooter } from '@/components/landing/site-footer'
import { LegalNav } from './legal-nav'

/**
 * Chrome shared by every legal/support page: the slim nav, a centered reading
 * column and the marketing footer (which cross-links the other policies). The page
 * itself only supplies the document body — either a `PolicyDocument` or the `Faq`.
 */
export function LegalPage({ locale, children }: { locale: Locale; children: ReactNode }) {
    return (
        <>
            <LegalNav locale={locale} />
            <main className="px-6 md:px-8">
                <article className="mx-auto max-w-3xl pt-36 pb-28 md:pt-40">{children}</article>
            </main>
            <SiteFooter />
        </>
    )
}
