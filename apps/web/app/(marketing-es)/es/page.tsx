import { setRequestLocale } from 'next-intl/server'

import { LandingPage } from '@/components/landing/landing-page'

export default function Page() {
    setRequestLocale('es')

    return <LandingPage />
}
