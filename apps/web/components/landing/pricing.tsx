import { getLocale, getTranslations } from 'next-intl/server'

import type { PublicPlan } from '@/lib/graphql/hooks/use-billing'
import { AvailablePlansDocument } from '@/lib/graphql/operations/account-billing'
import { gqlServerRequest } from '@/lib/graphql/server'
import { PrimaryCta } from '@/components/ui/cta'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Reveal } from '@/components/ui/reveal'
import { PricingPlans } from './pricing-plans'

/**
 * The catalog fetch is cached for this window, so the price is baked into the
 * prerendered HTML (crawler-visible, no skeleton) and the API is hit once per window
 * rather than once per visitor. The cost is that a price edited in /admin/plans takes
 * up to this long to appear, and a build run while the API is unreachable ships the
 * fallback CTA until the first revalidation.
 */
const REVALIDATE_SECONDS = 300

/** es prices in euros, everyone else in dollars. The catalog carries both. */
function currencyFor(locale: string): string {
    return locale === 'es' ? 'EUR' : 'USD'
}

async function loadPlans(audience: string): Promise<PublicPlan[]> {
    const data = await gqlServerRequest(AvailablePlansDocument, { audience }, REVALIDATE_SECONDS)

    return data.availablePlans
}

/**
 * The tariffs, straight from the catalog the admin edits — no prices hardcoded here.
 * Rendered on the server so the numbers are in the HTML: a crawler indexes them and a
 * cold visitor never watches a skeleton where the price should be.
 */
export async function Pricing() {
    const locale = await getLocale()
    const t = await getTranslations('landing.pricing')
    const currency = currencyFor(locale)

    // The API being down must cost us the price cards, not the whole landing page.
    const [athlete, coach] = await Promise.all([
        loadPlans('athlete').catch(() => []),
        loadPlans('coach').catch(() => []),
    ])
    const unavailable = athlete.length === 0 && coach.length === 0

    return (
        <section id="pricing" className="relative px-6 py-28 md:px-8 md:py-40">
            <div className="mx-auto max-w-[80rem]">
                {/* Centred, unlike the other sections' headings: the cards below are a
                    narrow, centred grid, so a left-aligned heading leaves a hole beside
                    it. Same reasoning as the CTA section. */}
                <Reveal className="mx-auto max-w-2xl text-center">
                    <Eyebrow>{t('eyebrow')}</Eyebrow>
                    <h2 className="mt-6 font-display text-display">{t('title')}</h2>
                    <p className="mt-5 text-body-lg text-text-dim">{t('body')}</p>
                </Reveal>

                {unavailable ? (
                    <Reveal className="mt-12 flex justify-center">
                        <PrimaryCta href="/register" analyticsId="pricing-register-fallback">
                            {t('fallbackCta')}
                        </PrimaryCta>
                    </Reveal>
                ) : (
                    <PricingPlans catalog={{ athlete, coach }} currency={currency} locale={locale} />
                )}
            </div>
        </section>
    )
}
