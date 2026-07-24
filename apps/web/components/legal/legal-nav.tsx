import { getTranslations } from 'next-intl/server'

import type { Locale } from '@/lib/i18n/config'
import { Mark } from '@/components/ui/icons'
import { TrackedLink } from '@/components/ui/tracked'

/**
 * Slim top bar for the legal/support pages. Unlike the landing `SiteNav` it carries
 * no in-page anchor links — those would be dead here — just the wordmark back to the
 * locale's home and the sign-in / start CTAs. Static (server) since nothing about it
 * is interactive.
 */
export async function LegalNav({ locale }: { locale: Locale }) {
    const t = await getTranslations('landing.nav')
    const home = locale === 'es' ? '/es' : '/'

    return (
        <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4">
            <nav className="mt-5 flex w-full max-w-3xl items-center justify-between gap-6 rounded-full bg-white/[0.04] py-2 pr-4 pl-5 ring-1 ring-hairline backdrop-blur-xl">
                <TrackedLink analyticsId="legal-nav-home" href={home} className="flex shrink-0 items-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-xl bg-ember-gradient text-bg">
                        <Mark className="size-4.5" />
                    </span>
                    <span className="font-display text-lg font-semibold tracking-tight">powerlog</span>
                </TrackedLink>

                <div className="flex shrink-0 items-center gap-2">
                    <TrackedLink
                        analyticsId="legal-nav-login"
                        href="/login"
                        className="hidden whitespace-nowrap rounded-full px-4 py-2 text-sm text-text-dim transition-colors hover:text-text sm:inline-flex"
                    >
                        {t('login')}
                    </TrackedLink>
                    <TrackedLink
                        analyticsId="legal-nav-register"
                        href="/register"
                        className="whitespace-nowrap rounded-full bg-white/[0.06] px-4 py-2 text-sm text-text ring-1 ring-hairline transition-colors hover:bg-white/[0.1]"
                    >
                        {t('startFree')}
                    </TrackedLink>
                </div>
            </nav>
        </header>
    )
}
