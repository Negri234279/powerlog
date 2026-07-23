import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'

import { legalMetadata } from '@/lib/seo'
import { Faq } from '@/components/legal/faq'
import { LegalPage } from '@/components/legal/legal-page'

export function generateMetadata(): Promise<Metadata> {
    return legalMetadata('faq', 'es')
}

export default function Page() {
    setRequestLocale('es')

    return (
        <LegalPage locale="es">
            <Faq />
        </LegalPage>
    )
}
