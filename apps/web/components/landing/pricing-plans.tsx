'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import type { PublicPlan } from '@/lib/graphql/hooks/use-billing'
import { cn } from '@/lib/cn'
import { PrimaryCta, SecondaryCta } from '@/components/ui/cta'
import { Check } from '@/components/ui/icons'
import { Reveal } from '@/components/ui/reveal'
import { SlidingTabs } from '@/components/ui/sliding-tabs'

const AUDIENCES = ['athlete', 'coach'] as const
const INTERVALS = ['month', 'year'] as const

type Audience = (typeof AUDIENCES)[number]
type Interval = (typeof INTERVALS)[number]

function money(amountCents: number, currency: string, locale: string): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        // 7,99 € reads like a price; 7,99 € with a stray .00 on 80 € does not.
        minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
    }).format(amountCents / 100)
}

function priceOf(plan: PublicPlan, interval: Interval, currency: string) {
    return plan.prices.find((price) => price.interval === interval && price.currency === currency) ?? null
}

/**
 * The yearly discount, computed from the catalog instead of asserted. If a year
 * costs 10× a month, this says 17% — and if someone reprices it tomorrow, it says
 * whatever is true tomorrow. Null when the plan isn't sold both ways.
 */
function yearlySavingPercent(plans: PublicPlan[], currency: string): number | null {
    const savings = plans.flatMap((plan) => {
        const month = priceOf(plan, 'month', currency)
        const year = priceOf(plan, 'year', currency)
        if (!month || !year || month.amountCents === 0) return []

        return [1 - year.amountCents / (month.amountCents * 12)]
    })

    if (savings.length === 0) return null

    const best = Math.max(...savings)

    return best > 0.01 ? Math.round(best * 100) : null
}

export function PricingPlans({
    catalog,
    currency,
    locale,
}: {
    catalog: Record<Audience, PublicPlan[]>
    currency: string
    locale: string
}) {
    const t = useTranslations('landing.plans')
    const [audience, setAudience] = useState<Audience>('athlete')
    const [interval, setInterval] = useState<Interval>('month')

    const audienceLabel: Record<Audience, string> = {
        athlete: t('audienceAthlete'),
        coach: t('audienceCoach'),
    }
    const plans = catalog[audience]
    const saving = yearlySavingPercent(plans, currency)
    // The paid plan the eye should land on: the cheapest one that costs money.
    const featured = plans.filter((plan) => !plan.isFree)[0]?.slug ?? null

    return (
        <>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <SlidingTabs
                    analyticsId="pricing-audience"
                    items={AUDIENCES.map((value) => ({ value, label: audienceLabel[value] }))}
                    value={audience}
                    onChange={(value) => setAudience(value as Audience)}
                />
                <SlidingTabs
                    analyticsId="pricing-interval"
                    items={[
                        { value: 'month', label: t('monthly') },
                        { value: 'year', label: saving ? t('yearlySave', { percent: saving }) : t('yearly') },
                    ]}
                    value={interval}
                    onChange={(value) => setInterval(value as Interval)}
                />
            </div>

            <div
                className={cn(
                    'mx-auto mt-14 grid grid-cols-1 gap-4 md:gap-6',
                    plans.length > 2 ? 'max-w-6xl md:grid-cols-3' : 'max-w-4xl md:grid-cols-2',
                )}
            >
                {plans.map((plan, index) => (
                    <Reveal key={plan.id} delay={index * 90}>
                        <PlanCard
                            plan={plan}
                            interval={interval}
                            currency={currency}
                            locale={locale}
                            featured={plan.slug === featured}
                        />
                    </Reveal>
                ))}
            </div>
        </>
    )
}

function PlanCard({
    plan,
    interval,
    currency,
    locale,
    featured,
}: {
    plan: PublicPlan
    interval: Interval
    currency: string
    locale: string
    featured: boolean
}) {
    const t = useTranslations('landing.plans')

    /**
     * What the plan gives, read off the entitlements the admin actually saved — not a
     * marketing list kept in sync by hand. Add a check to the catalog and it shows up
     * here; take one away and it disappears, so the landing cannot promise what the
     * server will refuse to grant.
     */
    function featuresOf(): string[] {
        const features: string[] = []

        // A cap of null reads as unlimited, a positive one as the number, and 0 drops
        // the line — the plan simply doesn't offer it.
        if (plan.maxWorkouts === null) features.push(t('featureWorkoutsUnlimited'))
        else if (plan.maxWorkouts > 0) features.push(t('featureWorkoutsLimited', { count: plan.maxWorkouts }))

        if (plan.maxTemplates === null) features.push(t('featureTemplatesUnlimited'))
        else if (plan.maxTemplates > 0) features.push(t('featureTemplatesLimited', { count: plan.maxTemplates }))

        if (plan.maxMesocycles === null) features.push(t('featureMesocyclesUnlimited'))
        else if (plan.maxMesocycles > 0) features.push(t('featureMesocyclesLimited', { count: plan.maxMesocycles }))

        if (plan.ai) features.push(t('featureAi'))
        if (plan.planSessions) features.push(t('featurePlanSessions'))

        // Only coaching plans have a roster. On an athlete plan the collapsed snapshot
        // still carries maxAthletes: 0 — that means "the limit doesn't apply to you", not
        // "you may coach zero athletes", and printing it would read as an insult.
        if (plan.planSessions) {
            const roster =
                plan.maxAthletes === null ? t('rosterUnlimited') : t('rosterLimited', { count: plan.maxAthletes })

            features.push(roster)
        }

        return features
    }

    /** The opening offer, said in one line. Null when the plan has none. */
    function offerLabel(): string | null {
        const offer = plan.offer
        if (!offer) return null

        if (offer.trialDays) return t('offerTrial', { days: offer.trialDays })
        if (offer.introPhase) {
            const { cycles, percentOff } = offer.introPhase

            return t('offerIntro', { percent: percentOff, cycles })
        }

        return offer.name
    }

    const price = plan.isFree ? null : priceOf(plan, interval, currency)
    const offer = offerLabel()

    return (
        <div
            className={cn(
                'rounded-[2rem] p-1.5 ring-1',
                featured ? 'bg-shell ring-ember/40 glow-ember' : 'bg-shell ring-hairline',
            )}
        >
            <div className="inset-hi flex h-full flex-col rounded-[calc(2rem-0.375rem)] bg-surface p-7 md:p-8">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-h3">{plan.name}</h3>
                    {featured ? (
                        <span className="rounded-full bg-ember/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-ember">
                            {t('mostPopular')}
                        </span>
                    ) : null}
                </div>

                <div className="mt-5 flex items-baseline gap-2">
                    {plan.isFree ? (
                        <>
                            <span className="font-display text-5xl font-semibold tracking-tight">{t('free')}</span>
                            <span className="font-mono text-sm text-text-faint">{t('forever')}</span>
                        </>
                    ) : price ? (
                        <>
                            <span className="font-display text-5xl font-semibold tracking-tight tabular-nums">
                                {money(price.amountCents, price.currency, locale)}
                            </span>
                            <span className="font-mono text-sm text-text-faint">
                                {interval === 'month' ? t('perMonth') : t('perYear')}
                            </span>
                        </>
                    ) : (
                        // The plan is on sale but not at this interval/currency. Saying
                        // nothing beats inventing a number.
                        <span className="font-display text-2xl font-semibold tracking-tight text-text-faint">
                            {interval === 'month'
                                ? t('notSoldMonthly', { currency })
                                : t('notSoldYearly', { currency })}
                        </span>
                    )}
                </div>

                {price && interval === 'year' ? (
                    <p className="mt-1 font-mono text-xs text-text-faint">
                        {t('billedYearly', {
                            price: money(Math.round(price.amountCents / 12), price.currency, locale),
                        })}
                    </p>
                ) : null}

                {offer ? (
                    <p className="mt-3 inline-flex w-fit rounded-full bg-ember/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-ember">
                        {offer}
                    </p>
                ) : null}

                {plan.description ? <p className="mt-3 text-body text-text-dim">{plan.description}</p> : null}

                <ul className="mt-7 flex-1 space-y-3">
                    {featuresOf().map((feature) => (
                        <li key={feature} className="flex items-start gap-3 text-body text-text-dim">
                            <Check className="mt-0.5 size-4 shrink-0 text-ember" />
                            {feature}
                        </li>
                    ))}
                </ul>

                <div className="mt-8">
                    {featured ? (
                        <PrimaryCta
                            href="/register"
                            className="w-full justify-between"
                            analyticsId={`pricing-register-${plan.slug}`}
                        >
                            {t('ctaStartWith', { plan: plan.name })}
                        </PrimaryCta>
                    ) : (
                        <SecondaryCta
                            href="/register"
                            className="w-full justify-center"
                            analyticsId={`pricing-register-${plan.slug}`}
                        >
                            {plan.isFree ? t('ctaStartFree') : t('ctaChoose', { plan: plan.name })}
                        </SecondaryCta>
                    )}
                </div>
            </div>
        </div>
    )
}
