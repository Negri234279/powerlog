'use client'

import { useLocale, useTranslations } from 'next-intl'
import { useEffect } from 'react'

import { type PublicPlan, useAvailablePlans } from '@/lib/graphql/hooks/use-billing'
import { cn } from '@/lib/cn'
import { Check } from '@/components/ui/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { SlidingTabs } from '@/components/ui/sliding-tabs'
import { TrackedButton } from '@/components/ui/tracked'
import { type Currency, CURRENCIES, type Interval, INTERVALS, money, priceOf } from './shared'

/**
 * One plan-selection step, reused for both audiences. The catalog is the public
 * `availablePlans` query (a guest has no session yet). Selecting a card lifts the
 * whole plan up; the price is derived from the interval/currency toggles, so the
 * choice survives switching monthly/yearly without re-picking.
 */
export function PlanStep({
    audience,
    interval,
    currency,
    onInterval,
    onCurrency,
    selected,
    onSelect,
}: {
    audience: 'athlete' | 'coach'
    interval: Interval
    currency: Currency
    onInterval: (value: Interval) => void
    onCurrency: (value: Currency) => void
    selected: PublicPlan | null
    onSelect: (plan: PublicPlan) => void
}) {
    const t = useTranslations('billing')
    const { data: plans, isLoading } = useAvailablePlans(audience)

    // Start on the free plan so "continue" is valid from the off; the user's own
    // pick (guarded by `!selected`) is never overwritten.
    useEffect(() => {
        if (!selected && plans && plans.length > 0) {
            onSelect(plans.find((plan) => plan.isFree) ?? plans[0]!)
        }
    }, [plans, selected, onSelect])

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-center gap-2">
                <SlidingTabs
                    analyticsId="wizard-interval"
                    items={INTERVALS.map((value) => ({ value, label: t(`interval.${value}` as 'interval.month') }))}
                    value={interval}
                    onChange={(value) => onInterval(value as Interval)}
                />
                <SlidingTabs
                    analyticsId="wizard-currency"
                    items={CURRENCIES.map((value) => ({ value, label: value }))}
                    value={currency}
                    onChange={(value) => onCurrency(value as Currency)}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {isLoading || !plans
                    ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-64 rounded-2xl" />)
                    : plans
                          .slice()
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((plan) => (
                              <PlanSelectCard
                                  key={plan.id}
                                  plan={plan}
                                  interval={interval}
                                  currency={currency}
                                  selected={selected?.id === plan.id}
                                  onSelect={() => onSelect(plan)}
                              />
                          ))}
            </div>
        </div>
    )
}

/** A selectable plan card: name, price at the chosen interval/currency, features. */
function PlanSelectCard({
    plan,
    interval,
    currency,
    selected,
    onSelect,
}: {
    plan: PublicPlan
    interval: Interval
    currency: Currency
    selected: boolean
    onSelect: () => void
}) {
    const t = useTranslations('billing')
    const tw = useTranslations('auth.wizard')
    const locale = useLocale()

    const price = plan.isFree ? null : priceOf(plan, interval, currency)

    // What the plan grants, read off the entitlements the admin saved (same source
    // as the landing and the plan page). A cap of null is unlimited, a positive one
    // is the number, and 0 drops the line — the plan simply doesn't offer it.
    const features: string[] = []

    if (plan.maxWorkouts === null) features.push(t('features.workoutsUnlimited'))
    else if (plan.maxWorkouts > 0) features.push(t('features.workoutsLimited', { count: plan.maxWorkouts }))

    if (plan.maxTemplates === null) features.push(t('features.templatesUnlimited'))
    else if (plan.maxTemplates > 0) features.push(t('features.templatesLimited', { count: plan.maxTemplates }))

    if (plan.maxMesocycles === null) features.push(t('features.mesocyclesUnlimited'))
    else if (plan.maxMesocycles > 0) features.push(t('features.mesocyclesLimited', { count: plan.maxMesocycles }))

    if (plan.ai) features.push(t('features.ai'))
    if (plan.planSessions) features.push(t('features.planSessions'))

    // The roster line only means something on a coaching plan (planSessions).
    if (plan.planSessions) {
        features.push(
            plan.maxAthletes === null
                ? t('features.athletesUnlimited')
                : t('features.athletes', { count: plan.maxAthletes }),
        )
    }

    return (
        <TrackedButton
            analyticsId={`wizard-plan-${plan.slug}`}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={onSelect}
            className={cn(
                'flex h-full flex-col rounded-2xl bg-surface p-6 text-left ring-1 transition-colors duration-300',
                selected ? 'ring-ember/60 glow-ember' : 'ring-hairline hover:ring-ember/30',
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-h4 tracking-tight">{plan.name}</h3>
                <span
                    className={cn(
                        'grid size-5 shrink-0 place-items-center rounded-full ring-1 transition-colors duration-300',
                        selected ? 'bg-ember text-bg ring-ember' : 'ring-hairline',
                    )}
                >
                    {selected ? <Check className="size-3.5" /> : null}
                </span>
            </div>

            <p className="mt-3 font-display text-h3 tabular-nums tracking-tight">
                {plan.isFree ? (
                    t('free')
                ) : price ? (
                    <>
                        {money(price.amountCents, price.currency, locale)}
                        <span className="ml-1 font-sans text-sm text-text-faint">
                            {interval === 'month' ? tw('perMonth') : tw('perYear')}
                        </span>
                    </>
                ) : (
                    <span className="text-sm text-text-faint">{tw('notAvailable')}</span>
                )}
            </p>

            {plan.description ? <p className="mt-2 text-sm text-text-dim">{plan.description}</p> : null}

            <ul className="mt-4 flex-1 space-y-1.5 text-sm text-text-dim">
                {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 size-4 shrink-0 text-ember" />
                        {feature}
                    </li>
                ))}
            </ul>

            <span
                className={cn(
                    'mt-5 rounded-full py-2 text-center text-sm',
                    selected ? 'bg-ember/10 text-ember' : 'bg-white/[0.04] text-text-faint',
                )}
            >
                {selected ? tw('selected') : tw('select')}
            </span>
        </TrackedButton>
    )
}
