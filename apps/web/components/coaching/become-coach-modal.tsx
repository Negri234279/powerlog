'use client'

import { useTranslations } from 'next-intl'
import { useId, useState } from 'react'

import { type PublicPlan, type PublicPrice, useAvailablePlans, useStartCheckout } from '@/lib/graphql/hooks/use-billing'
import { useBecomeCoach } from '@/lib/graphql/hooks/use-coaching'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { FormError } from '@/components/ui/form-error'
import { Check } from '@/components/ui/icons'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { SlidingTabs } from '@/components/ui/sliding-tabs'
import { TrackedButton } from '@/components/ui/tracked'

const INTERVALS = ['month', 'year'] as const
const CURRENCIES = ['EUR', 'USD'] as const

function formatAmount(amountCents: number, currency: string): string {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amountCents / 100)
}

/**
 * Coach onboarding, front half. Instead of flipping the role for free, the athlete
 * picks a coaching plan here:
 *  - the **free** coach plan promotes them on the spot (`becomeCoach` re-issues the
 *    session, so the JWT carries `role=coach` immediately);
 *  - a **paid** coach plan sends them to the gateway. They stay an athlete until the
 *    webhook activates the subscription — that is what promotes them (server-side),
 *    and `/profile/plan` refreshes the session so the new role reaches the JWT.
 */
export function BecomeCoachModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const t = useTranslations('coaching')
    const tb = useTranslations('billing')
    const titleId = useId()
    const { data: plans, isLoading } = useAvailablePlans('coach')

    const [interval, setInterval] = useState<(typeof INTERVALS)[number]>('month')
    const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>('EUR')

    return (
        <Modal open={open} onClose={onClose} labelledBy={titleId} widthClassName="max-w-5xl">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 id={titleId} className="font-display text-h3 tracking-tight">
                        {t('becomeTitle')}
                    </h2>
                    <p className="mt-1 text-sm text-text-dim">{t('becomeModalSubtitle')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <SlidingTabs
                        analyticsId="become-coach-interval"
                        items={INTERVALS.map((value) => ({
                            value,
                            label: tb(`interval.${value}` as 'interval.month'),
                        }))}
                        value={interval}
                        onChange={(value) => setInterval(value as (typeof INTERVALS)[number])}
                    />
                    <SlidingTabs
                        analyticsId="become-coach-currency"
                        items={CURRENCIES.map((value) => ({ value, label: value }))}
                        value={currency}
                        onChange={(value) => setCurrency(value as (typeof CURRENCIES)[number])}
                    />
                </div>
            </div>

            <div className="mt-6 grid max-h-[70vh] gap-4 overflow-y-auto pr-1 md:grid-cols-2 lg:grid-cols-3">
                {isLoading
                    ? Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-72 rounded-2xl" />)
                    : plans
                          ?.slice()
                          .sort((a, b) => a.sortOrder - b.sortOrder)
                          .map((plan) => (
                              <CoachPlanCard
                                  key={plan.id}
                                  plan={plan}
                                  price={plan.prices.find(
                                      (candidate) => candidate.interval === interval && candidate.currency === currency,
                                  )}
                                  onDone={onClose}
                              />
                          ))}
            </div>
        </Modal>
    )
}

/** One coach plan in the onboarding modal. Free promotes on the spot; paid checks out. */
function CoachPlanCard({
    plan,
    price,
    onDone,
}: {
    plan: PublicPlan
    price: PublicPrice | undefined
    onDone: () => void
}) {
    const t = useTranslations('coaching')
    const tb = useTranslations('billing')
    const toMessage = useErrorMessage()
    const become = useBecomeCoach()
    const checkout = useStartCheckout()
    const [error, setError] = useState<string | null>(null)

    // A price no gateway can sell is shown honestly, but there is nothing to click.
    const gateways = price?.gateways ?? []
    const offer = plan.offer

    const startFree = () => {
        setError(null)
        become.mutate(undefined, { onSuccess: () => onDone(), onError: (err) => setError(toMessage(err)) })
    }

    const buy = (gateway: string) => {
        setError(null)
        if (!price) return

        // No `changePlan` branch: the onboarding path is for an athlete with no
        // subscription. The redirect leaves the page; the webhook does the rest.
        checkout.mutate(
            { planPriceId: price.id, gateway, offerId: offer?.id ?? null },
            { onError: (err) => setError(toMessage(err)) },
        )
    }

    return (
        <article className="flex flex-col rounded-2xl bg-bg/40 p-6 ring-1 ring-hairline">
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-h4 tracking-tight">{plan.name}</h3>
                {offer ? (
                    <span className="rounded-full bg-ember/15 px-2 py-0.5 font-mono text-eyebrow uppercase text-ember">
                        {offer.trialDays
                            ? tb('offerTrial', { days: offer.trialDays })
                            : tb('offerDiscount', { percent: offer.introPhase?.percentOff ?? 0 })}
                    </span>
                ) : null}
            </div>

            {plan.description ? <p className="mt-2 text-sm text-text-dim">{plan.description}</p> : null}

            <p className="mt-4 font-display text-h3 tabular-nums tracking-tight">
                {plan.isFree
                    ? tb('free')
                    : price
                      ? formatAmount(price.amountCents, price.currency)
                      : tb('priceUnavailable')}
                {!plan.isFree && price ? (
                    <span className="ml-1 font-sans text-sm text-text-faint">
                        / {tb(`interval.${price.interval}` as 'interval.month')}
                    </span>
                ) : null}
            </p>

            <ul className="mt-4 flex-1 space-y-1.5 text-sm text-text-dim">
                <Feature on>
                    {plan.maxAthletes === null
                        ? tb('features.athletesUnlimited')
                        : tb('features.athletes', { count: plan.maxAthletes })}
                </Feature>
                <Feature on={plan.planSessions}>{tb('features.planSessions')}</Feature>
                <Feature on={plan.ai}>{tb('features.ai')}</Feature>
            </ul>

            <FormError error={error} />

            <div className="mt-5 space-y-2">
                {plan.isFree ? (
                    <TrackedButton
                        analyticsId="become-coach-free"
                        type="button"
                        disabled={become.isPending}
                        onClick={startFree}
                        className="w-full rounded-full bg-ember-gradient py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {t('becomeFree')}
                    </TrackedButton>
                ) : (
                    gateways.map((gateway, index) => (
                        <TrackedButton
                            key={gateway}
                            analyticsId={`become-coach-checkout-${gateway}`}
                            type="button"
                            disabled={!price || checkout.isPending}
                            onClick={() => buy(gateway)}
                            className={
                                index === 0
                                    ? 'w-full rounded-full bg-ember-gradient py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'
                                    : 'w-full rounded-full py-2.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text disabled:opacity-50'
                            }
                        >
                            {tb('subscribeWith', { gateway: tb(`gateway.${gateway}` as 'gateway.stripe') })}
                        </TrackedButton>
                    ))
                )}
                {!plan.isFree && price && gateways.length === 0 ? (
                    <p className="text-center text-xs text-text-faint">{tb('noGateway')}</p>
                ) : null}
            </div>
        </article>
    )
}

function Feature({ on, children }: { on: boolean; children: React.ReactNode }) {
    return (
        <li className={`flex items-center gap-2 ${on ? '' : 'text-text-faint line-through'}`}>
            <Check className={`size-4 ${on ? 'text-ember' : 'text-text-faint'}`} />
            {children}
        </li>
    )
}
