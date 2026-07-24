import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'

import { contactMetadata } from '@/lib/seo'
import { ContactForm } from '@/components/contact/contact-form'
import { LegalPage } from '@/components/legal/legal-page'

export function generateMetadata(): Promise<Metadata> {
    return contactMetadata('en')
}

export default function Page() {
    setRequestLocale('en')

    return (
        <LegalPage locale="en">
            <ContactForm />
        </LegalPage>
    )
}
