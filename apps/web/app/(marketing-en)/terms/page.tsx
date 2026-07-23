import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'

import { legalMetadata } from '@/lib/seo'
import { LegalPage } from '@/components/legal/legal-page'
import { PolicyDocument } from '@/components/legal/policy-document'

export function generateMetadata(): Promise<Metadata> {
    return legalMetadata('terms', 'en')
}

export default function Page() {
    setRequestLocale('en')

    return (
        <LegalPage locale="en">
            <PolicyDocument namespace="legal.terms" />
        </LegalPage>
    )
}
