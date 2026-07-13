'use client'

import { useTranslations } from 'next-intl'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

import {
    type MySubscription,
    type PublicPlan,
    type PublicPrice,
    useAvailablePlans,
    useCancelSubscription,
    useChangePlan,
    useMyPlan,
    useResumeSubscription,
    useStartCheckout,
} from '@/lib/graphql/hooks/use-billing'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { FormError } from '@/components/ui/form-error'
import { Check } from '@/components/ui/icons'
import { Skeleton } from '@/components/ui/skeleton'
import { SlidingTabs } from '@/components/ui/sliding-tabs'
import { TrackedButton } from '@/components/ui/tracked'

const INTERVALS = ['month', 'year'] as const
const CURRENCIES = ['EUR', 'USD'] as const

function formatAmount(amountCents: number, currency: string): string {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amountCents / 100)
}

export default function PlanPage() {
    const t = useTranslations('billing')
    const searchParams = useSearchParams()
    const { data: me } = useMe()
    const { data: mine, isLoading: loadingMine } = useMyPlan()
    // The audience decides which catalog they see. It comes from their plan (a coach
    // on a coach plan), falling back to their role while that loads.
    const audience = mine?.myEntitlements.audience ?? me?.role ?? 'athlete'
    const { data: plans, isLoading: loadingPlans } = useAvailablePlans(audience)

    const [interval, setInterval] = useState<(typeof INTERVALS)[number]>('month')
    const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>('EUR')

    const checkout = searchParams.get('checkout')
    const subscription = mine?.mySubscription ?? null

    return (
        <div className="space-y-8">
            {/* The redirect is not the truth: the subscription is created by the
                webhook, and this page is told to refetch by the realtime event. So the
                banner says "we're finishing up", not "you're in". */}
            {checkout === 'success' ? <Banner tone="ok">{t('checkoutSuccess')}</Banner> : null}
            {checkout === 'cancelled' ? <Banner tone="muted">{t('checkoutCancelled')}</Banner> : null}

            {loadingMine ? (
                <Skeleton className="h-32 rounded-2xl" />
            ) : (
                <CurrentPlan subscription={subscription} planSlug={mine?.myEntitlements.plan ?? 'free'} />
            )}

            <section>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-h4 tracking-tight">{t('choosePlan')}</h2>
                    <div className="flex items-center gap-2">
                        <SlidingTabs
                            analyticsId="billing-interval"
                            items={INTERVALS.map((value) => ({ value, label: t(`interval.${value}`) }))}
                            value={interval}
                            onChange={(value) => setInterval(value as (typeof INTERVALS)[number])}
                        />
                        <SlidingTabs
                            analyticsId="billing-currency"
                            items={CURRENCIES.map((value) => ({ value, label: value }))}
                            value={currency}
                            onChange={(value) => setCurrency(value as (typeof CURRENCIES)[number])}
                        />
                    </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {loadingPlans
                        ? Array.from({ length: 3 }).map((_, index) => (
                              <Skeleton key={index} className="h-72 rounded-2xl" />
                          ))
                        : plans
                              ?.slice()
                              .sort((a, b) => a.sortOrder - b.sortOrder)
                              .map((plan) => (
                                  <PlanCard
                                      key={plan.id}
                                      plan={plan}
                                      price={plan.prices.find(
                                          (candidate) =>
                                              candidate.interval === interval && candidate.currency === currency,
                                      )}
                                      subscription={subscription}
                                      currentPlanSlug={mine?.myEntitlements.plan ?? null}
                                  />
                              ))}
                </div>
            </section>
        </div>
    )
}

function Banner({ tone, children }: { tone: 'ok' | 'muted'; children: React.ReactNode }) {
    return (
        <p
            className={`rounded-2xl px-4 py-3 text-sm ring-1 ${
                tone === 'ok' ? 'bg-ember/10 text-ember ring-ember/30' : 'bg-surface text-text-dim ring-hairline'
            }`}
        >
            {children}
        </p>
    )
}

/** What the user is on right now, and the two things they can do about it. */
function CurrentPlan({ subscription, planSlug }: { subscription: MySubscription | null; planSlug: string }) {
    const t = useTranslations('billing')
    const toMessage = useErrorMessage()
    const cancel = useCancelSubscription()
    const resume = useResumeSubscription()
    const [confirming, setConfirming] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const endsOn = subscription ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : null

    return (
        <section className="rounded-2xl bg-surface p-6 ring-1 ring-hairline">
            <p className="font-mono text-eyebrow uppercase text-text-faint">{t('currentPlan')}</p>
            <h2 className="mt-2 font-display text-h3 tracking-tight">{subscription?.planName ?? t('freePlan')}</h2>

            {subscription ? (
                <p className="mt-2 text-sm text-text-dim">
                    {subscription.amountCents !== null && subscription.currency && subscription.interval
                        ? `${formatAmount(subscription.amountCents, subscription.currency)} / ${t(`interval.${subscription.interval}` as 'interval.month')}`
                        : t('grantedByAdmin')}
                    <span className="mx-2 text-hairline">·</span>
                    {/* Cancelling never takes back time that was paid for, so the copy
                        says exactly when access ends — not "cancelled, goodbye". */}
                    {subscription.cancelAtPeriodEnd
                        ? t('accessUntil', { date: endsOn ?? '' })
                        : t('renewsOn', { date: endsOn ?? '' })}
                </p>
            ) : (
                <p className="mt-2 text-sm text-text-dim">{t('freePlanBody')}</p>
            )}

            {subscription?.pendingPlanSlug ? (
                <p className="mt-2 text-xs text-text-faint">
                    {t('pendingDowngrade', { plan: subscription.pendingPlanSlug, date: endsOn ?? '' })}
                </p>
            ) : null}

            {subscription?.status === 'past_due' ? (
                <p className="mt-3 rounded-xl bg-ember/10 px-3 py-2 text-xs text-ember">{t('pastDue')}</p>
            ) : null}

            <FormError error={error} />

            {subscription && subscription.gateway !== 'manual' ? (
                <div className="mt-4">
                    {subscription.cancelAtPeriodEnd ? (
                        <TrackedButton
                            analyticsId="billing-resume"
                            type="button"
                            disabled={resume.isPending}
                            onClick={() => resume.mutate(undefined, { onError: (err) => setError(toMessage(err)) })}
                            className="rounded-full bg-ember-gradient px-5 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98]"
                        >
                            {t('resume')}
                        </TrackedButton>
                    ) : (
                        <TrackedButton
                            analyticsId="billing-cancel-open"
                            type="button"
                            onClick={() => setConfirming(true)}
                            className="rounded-full px-5 py-2.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text"
                        >
                            {t('cancel')}
                        </TrackedButton>
                    )}
                </div>
            ) : null}

            <p className="mt-4 font-mono text-eyebrow uppercase text-text-faint">{planSlug}</p>

            <ConfirmModal
                open={confirming}
                onClose={() => setConfirming(false)}
                onConfirm={() =>
                    cancel.mutate(undefined, {
                        onSuccess: () => setConfirming(false),
                        onError: (err) => {
                            setError(toMessage(err))
                            setConfirming(false)
                        },
                    })
                }
                title={t('cancelTitle')}
                description={t('cancelBody', { date: endsOn ?? '' })}
                confirmLabel={t('cancelConfirm')}
                cancelLabel={t('keepPlan')}
                pending={cancel.isPending}
                analyticsId="billing-cancel"
            />
        </section>
    )
}

function PlanCard({
    plan,
    price,
    subscription,
    currentPlanSlug,
}: {
    plan: PublicPlan
    price: PublicPrice | undefined
    subscription: MySubscription | null
    currentPlanSlug: string | null
}) {
    const t = useTranslations('billing')
    const toMessage = useErrorMessage()
    const checkout = useStartCheckout()
    const changePlan = useChangePlan()
    const [error, setError] = useState<string | null>(null)

    const isCurrent = currentPlanSlug === plan.slug
    // A price no gateway can sell is shown honestly, but there is nothing to click.
    const gateway = price?.gateways[0] ?? null
    const offer = plan.offer

    const buy = () => {
        setError(null)
        if (!price || !gateway) return

        // Someone who already pays switches plan; they do not buy a second one.
        if (subscription) {
            changePlan.mutate(price.id, { onError: (err) => setError(toMessage(err)) })
            return
        }

        checkout.mutate(
            { planPriceId: price.id, gateway, offerId: offer?.id ?? null },
            { onError: (err) => setError(toMessage(err)) },
        )
    }

    return (
        <article
            className={`flex flex-col rounded-2xl bg-surface p-6 ring-1 ${
                isCurrent ? 'ring-ember/50' : 'ring-hairline'
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-h4 tracking-tight">{plan.name}</h3>
                {offer ? (
                    <span className="rounded-full bg-ember/15 px-2 py-0.5 font-mono text-eyebrow uppercase text-ember">
                        {offer.trialDays
                            ? t('offerTrial', { days: offer.trialDays })
                            : t('offerDiscount', { percent: offer.introPhase?.percentOff ?? 0 })}
                    </span>
                ) : null}
            </div>

            {plan.description ? <p className="mt-2 text-sm text-text-dim">{plan.description}</p> : null}

            <p className="mt-4 font-display text-h3 tabular-nums tracking-tight">
                {plan.isFree
                    ? t('free')
                    : price
                      ? formatAmount(price.amountCents, price.currency)
                      : t('priceUnavailable')}
                {!plan.isFree && price ? (
                    <span className="ml-1 font-sans text-sm text-text-faint">
                        / {t(`interval.${price.interval}` as 'interval.month')}
                    </span>
                ) : null}
            </p>

            <ul className="mt-4 flex-1 space-y-1.5 text-sm text-text-dim">
                <Feature on={plan.templates}>{t('features.templates')}</Feature>
                <Feature on={plan.mesocycles}>{t('features.mesocycles')}</Feature>
                <Feature on={plan.ai}>{t('features.ai')}</Feature>
                {plan.planSessions ? (
                    <>
                        <Feature on>{t('features.planSessions')}</Feature>
                        <Feature on>
                            {plan.maxAthletes === null
                                ? t('features.athletesUnlimited')
                                : t('features.athletes', { count: plan.maxAthletes })}
                        </Feature>
                    </>
                ) : null}
            </ul>

            <FormError error={error} />

            <div className="mt-5">
                {isCurrent ? (
                    <p className="rounded-full bg-white/[0.04] py-2.5 text-center text-sm text-text-faint">
                        {t('yourPlan')}
                    </p>
                ) : plan.isFree ? null : (
                    <TrackedButton
                        analyticsId="billing-checkout"
                        type="button"
                        disabled={!price || !gateway || checkout.isPending || changePlan.isPending}
                        onClick={buy}
                        className="w-full rounded-full bg-ember-gradient py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {subscription ? t('switchToPlan') : t('subscribe')}
                    </TrackedButton>
                )}
                {!plan.isFree && price && !gateway ? (
                    <p className="mt-2 text-center text-xs text-text-faint">{t('noGateway')}</p>
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
