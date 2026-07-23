import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'

import { legalMetadata } from '@/lib/seo'
import { LegalPage } from '@/components/legal/legal-page'
import { PolicyDocument } from '@/components/legal/policy-document'

export function generateMetadata(): Promise<Metadata> {
    return legalMetadata('cookies', 'es')
}

export default function Page() {
    setRequestLocale('es')

    return (
        <LegalPage locale="es">
            <PolicyDocument namespace="legal.cookies" />
        </LegalPage>
    )
}
