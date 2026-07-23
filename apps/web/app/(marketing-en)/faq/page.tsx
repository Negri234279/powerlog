import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'

import { legalMetadata } from '@/lib/seo'
import { Faq } from '@/components/legal/faq'
import { LegalPage } from '@/components/legal/legal-page'

export function generateMetadata(): Promise<Metadata> {
    return legalMetadata('faq', 'en')
}

export default function Page() {
    setRequestLocale('en')

    return (
        <LegalPage locale="en">
            <Faq />
        </LegalPage>
    )
}
