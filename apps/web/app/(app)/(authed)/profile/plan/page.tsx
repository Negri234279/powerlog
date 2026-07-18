'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

import { refreshSession } from '@/lib/graphql/client'
import {
    type AthleteEntitlements,
    type CoachEntitlements,
    type MySubscription,
    type PlanAudience,
    type PublicPlan,
    type PublicPrice,
    useAvailablePlans,
    useBillingPortalUrl,
    useCancelSubscription,
    useChangePlan,
    useMyPlan,
    useMyWorkoutUsage,
    useResumeSubscription,
    useStartCheckout,
} from '@/lib/graphql/hooks/use-billing'
import { track } from '@/lib/analytics/events'
import { formatNumericDate } from '@/lib/format-date'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { FormError } from '@/components/ui/form-error'
import { ArrowUpRight, Check } from '@/components/ui/icons'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { SlidingTabs } from '@/components/ui/sliding-tabs'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'

const INTERVALS = ['month', 'year'] as const
const CURRENCIES = ['EUR', 'USD'] as const

// The subscription statuses that actually grant the plan — mirrors the API's
// ENTITLING_STATUSES. Reaching one of these is what turns "finishing up" into "done".
const ENTITLING_STATUSES = ['active', 'trialing', 'past_due']

function formatAmount(amountCents: number, currency: string): string {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amountCents / 100)
}

function isAudience(value: string | null): value is PlanAudience {
    return value === 'athlete' || value === 'coach'
}

export default function PlanPage() {
    const t = useTranslations('billing')
    const searchParams = useSearchParams()
    const router = useRouter()
    const pathname = usePathname()
    const { data: me } = useMe()
    const { data: mine, isLoading: loadingMine } = useMyPlan()
    const queryClient = useQueryClient()

    // A user does coaching iff they have a coach entitlements section (coach role or
    // a live coach subscription) — that is what puts the Coach tab on the page.
    const showCoachTab = mine?.myEntitlements.coach != null

    const [interval, setInterval] = useState<(typeof INTERVALS)[number]>('month')
    const [currency, setCurrency] = useState<(typeof CURRENCIES)[number]>('EUR')
    const [tab, setTab] = useState<PlanAudience>('athlete')

    const checkout = searchParams.get('checkout')
    // The audience the checkout was for (start-checkout writes it on the success URL):
    // which tab just paid, so we wait on the right subscription and can focus its tab.
    const returnAudienceParam = searchParams.get('audience')
    const returnAudience: PlanAudience = isAudience(returnAudienceParam) ? returnAudienceParam : 'athlete'

    // The tab that is actually shown: a non-coach only ever has the athlete one.
    const activeAudience: PlanAudience = showCoachTab ? tab : 'athlete'

    // Coming back from a coach-plan checkout, jump to the Coach tab once it exists.
    useEffect(() => {
        if (checkout === 'success' && returnAudience === 'coach' && showCoachTab) setTab('coach')
    }, [checkout, returnAudience, showCoachTab])

    const subscriptionFor = (audience: PlanAudience): MySubscription | null =>
        (audience === 'coach' ? mine?.coachSubscription : mine?.athleteSubscription) ?? null

    // The redirect only means "the gateway sent us back". The plan is really live once
    // the webhook has written a subscription (in the audience that paid) in an
    // entitling status, and the realtime event has refetched us into it.
    const returnedSubscription = subscriptionFor(returnAudience)
    const isActivated = returnedSubscription !== null && ENTITLING_STATUSES.includes(returnedSubscription.status)
    const awaitingActivation = checkout === 'success' && !isActivated

    // Confirm the activation once, on the pending → active transition.
    const [activatedOpen, setActivatedOpen] = useState(false)
    const celebratedRef = useRef(false)

    useEffect(() => {
        if (checkout === 'success' && isActivated && !celebratedRef.current) {
            celebratedRef.current = true
            setActivatedOpen(true)
        }
    }, [checkout, isActivated])

    // Coach onboarding, last step. When a COACH plan activates here, the server has
    // already flipped this user athlete → coach (the webhook promotes them). But this
    // tab's JWT still says athlete, and the realtime push only refetches the plan —
    // not `me`. So re-mint the session (the refresh reads the new DB role) and re-read
    // `me`, so coach-gated API calls and SSR gates open without a re-login. Once.
    const promotedRef = useRef(false)

    useEffect(() => {
        const activatedCoachPlan = checkout === 'success' && isActivated && returnAudience === 'coach'
        if (activatedCoachPlan && me?.role !== 'coach' && !promotedRef.current) {
            promotedRef.current = true
            void refreshSession().then(() => queryClient.invalidateQueries({ queryKey: ['me'] }))
        }
    }, [checkout, isActivated, returnAudience, me?.role, queryClient])

    // The gateway sent them back — the one step of the funnel only the client sees
    // (PayPal never reports a walk-away). Once per landing.
    const returnTrackedRef = useRef(false)

    useEffect(() => {
        if ((checkout === 'success' || checkout === 'cancelled') && !returnTrackedRef.current) {
            returnTrackedRef.current = true
            track('checkout_returned', { result: checkout })

            // `success` keeps the params until the activation modal is dismissed;
            // `cancelled` has no modal to clean the URL, so it is dropped here — a
            // refresh must not count a second walk-away.
            if (checkout === 'cancelled') {
                const params = new URLSearchParams(searchParams)
                params.delete('checkout')
                params.delete('audience')
                const query = params.toString()

                router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
            }
        }
    }, [checkout, searchParams, router, pathname])

    /**
     * Dismissing the confirmation also drops `?checkout=success&audience=…` from the
     * URL. The params' whole job was "the gateway just sent them back", done the
     * moment they acknowledge it; left there, a refresh re-celebrates a plan bought
     * days ago. `replace` rather than `push` so Back does not walk into it either.
     */
    const dismissActivated = useCallback(() => {
        setActivatedOpen(false)

        const params = new URLSearchParams(searchParams)
        params.delete('checkout')
        params.delete('audience')
        const query = params.toString()

        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }, [router, pathname, searchParams])

    return (
        <div className="space-y-8">
            {/* The redirect is not the truth: the subscription is created by the
                webhook, and this page is told to refetch by the realtime event. So the
                banner says "we're finishing up", and disappears the moment the plan is
                actually live. */}
            {awaitingActivation ? <Banner tone="ok">{t('checkoutSuccess')}</Banner> : null}
            {checkout === 'cancelled' ? <Banner tone="muted">{t('checkoutCancelled')}</Banner> : null}

            {showCoachTab ? (
                <SlidingTabs
                    analyticsId="plan-audience"
                    items={(['athlete', 'coach'] as const).map((value) => ({
                        value,
                        label: t(`tabs.${value}`),
                    }))}
                    value={activeAudience}
                    onChange={(value) => setTab(value as PlanAudience)}
                />
            ) : null}

            {loadingMine || !mine ? (
                <Skeleton className="h-32 rounded-2xl" />
            ) : (
                <PlanAudienceSection
                    audience={activeAudience}
                    subscription={subscriptionFor(activeAudience)}
                    athlete={mine.myEntitlements.athlete}
                    coach={mine.myEntitlements.coach}
                    interval={interval}
                    currency={currency}
                    onInterval={setInterval}
                    onCurrency={setCurrency}
                />
            )}

            <ActivatedModal
                open={activatedOpen}
                onClose={dismissActivated}
                planName={returnedSubscription?.planName ?? ''}
            />
        </div>
    )
}

/** Everything for one audience: the current plan, what it grants, and the catalog. */
function PlanAudienceSection({
    audience,
    subscription,
    athlete,
    coach,
    interval,
    currency,
    onInterval,
    onCurrency,
}: {
    audience: PlanAudience
    subscription: MySubscription | null
    athlete: AthleteEntitlements
    coach: CoachEntitlements | null
    interval: (typeof INTERVALS)[number]
    currency: (typeof CURRENCIES)[number]
    onInterval: (value: (typeof INTERVALS)[number]) => void
    onCurrency: (value: (typeof CURRENCIES)[number]) => void
}) {
    const t = useTranslations('billing')
    const { data: plans, isLoading: loadingPlans } = useAvailablePlans(audience)

    const currentPlanSlug = audience === 'coach' ? (coach?.plan ?? null) : athlete.plan

    return (
        <div className="space-y-8">
            <CurrentPlan subscription={subscription} planSlug={currentPlanSlug ?? 'free'} audience={audience} />

            {audience === 'coach' ? (
                coach && <CoachPlanSummary coach={coach} />
            ) : (
                <AthleteUsageSummary entitlements={athlete} />
            )}

            <section>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-display text-h4 tracking-tight">{t('choosePlan')}</h2>
                    <div className="flex items-center gap-2">
                        <SlidingTabs
                            analyticsId="billing-interval"
                            items={INTERVALS.map((value) => ({ value, label: t(`interval.${value}`) }))}
                            value={interval}
                            onChange={(value) => onInterval(value as (typeof INTERVALS)[number])}
                        />
                        <SlidingTabs
                            analyticsId="billing-currency"
                            items={CURRENCIES.map((value) => ({ value, label: value }))}
                            value={currency}
                            onChange={(value) => onCurrency(value as (typeof CURRENCIES)[number])}
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
                                      currentPlanSlug={currentPlanSlug}
                                  />
                              ))}
                </div>
            </section>
        </div>
    )
}

/** A one-time confirmation that the paid plan is now live. */
function ActivatedModal({ open, onClose, planName }: { open: boolean; onClose: () => void; planName: string }) {
    const t = useTranslations('billing')
    const titleId = useId()

    return (
        <Modal open={open} onClose={onClose} labelledBy={titleId}>
            <div className="flex flex-col items-center text-center">
                <span className="grid size-12 place-items-center rounded-full bg-ember/15 text-ember">
                    <Check className="size-6" />
                </span>
                <h2 id={titleId} className="mt-4 font-display text-h3 tracking-tight">
                    {t('activatedTitle')}
                </h2>
                <p className="mt-2 text-sm text-text-dim">{t('activatedBody', { plan: planName })}</p>
                <TrackedButton
                    analyticsId="billing-activated-ack"
                    type="button"
                    onClick={onClose}
                    className="mt-6 rounded-full bg-ember-gradient px-6 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98]"
                >
                    {t('activatedClose')}
                </TrackedButton>
            </div>
        </Modal>
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

/** How much of each capped resource the user has spent, against their athlete plan's
 *  caps. Unlimited caps show the count with no bar; a cap of 0 (the plan doesn't offer
 *  it) is dropped. Read-only — the server is what actually enforces the caps. */
function AthleteUsageSummary({ entitlements }: { entitlements: AthleteEntitlements }) {
    const t = useTranslations('billing.usage')
    const { data: usage } = useMyWorkoutUsage()

    const rows = [
        { key: 'workouts' as const, label: t('workouts'), cap: entitlements.maxWorkouts, used: usage?.workouts ?? 0 },
        {
            key: 'templates' as const,
            label: t('templates'),
            cap: entitlements.maxTemplates,
            used: usage?.templates ?? 0,
        },
        {
            key: 'mesocycles' as const,
            label: t('mesocycles'),
            cap: entitlements.maxMesocycles,
            used: usage?.mesocycles ?? 0,
        },
    ].filter((row) => row.cap !== 0)

    if (rows.length === 0) return null

    return (
        <section className="rounded-2xl bg-surface p-6 ring-1 ring-hairline">
            <p className="font-mono text-eyebrow uppercase text-text-faint">{t('title')}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {rows.map((row) => {
                    const cap = row.cap
                    const pct = cap === null ? 100 : Math.min(100, Math.round((row.used / Math.max(1, cap)) * 100))
                    const atLimit = cap !== null && row.used >= cap
                    const valueText =
                        cap === null ? t('unlimited', { used: row.used }) : t('ofLimit', { used: row.used, limit: cap })

                    return (
                        <div key={row.key}>
                            <div className="flex items-baseline justify-between gap-2">
                                <span className="text-sm text-text-dim">{row.label}</span>
                                <span
                                    className={`font-mono text-sm tabular-nums ${atLimit ? 'text-ember' : 'text-text'}`}
                                >
                                    {valueText}
                                </span>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                                <div
                                    className={`h-full rounded-full transition-[width] duration-500 ease-spring ${
                                        cap === null ? 'bg-white/15' : atLimit ? 'bg-ember' : 'bg-ember/60'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    )
                })}
            </div>
        </section>
    )
}

/** What the coach plan grants, as a read-only summary (the coach catalog below is
 *  where they change tier). Coaching quotas are separate from the athlete plan's. */
function CoachPlanSummary({ coach }: { coach: CoachEntitlements }) {
    const t = useTranslations('billing')

    return (
        <section className="rounded-2xl bg-surface p-6 ring-1 ring-hairline">
            <p className="font-mono text-eyebrow uppercase text-text-faint">{t('coachPlanIncludes')}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-text-dim">
                <Feature on>
                    {coach.maxAthletes === null
                        ? t('features.athletesUnlimited')
                        : t('features.athletes', { count: coach.maxAthletes })}
                </Feature>
                <Feature on={coach.planSessions}>{t('features.planSessions')}</Feature>
                {coach.maxTemplates === null ? (
                    <Feature on>{t('features.templatesUnlimited')}</Feature>
                ) : coach.maxTemplates > 0 ? (
                    <Feature on>{t('features.templatesLimited', { count: coach.maxTemplates })}</Feature>
                ) : null}
                {coach.maxMesocycles === null ? (
                    <Feature on>{t('features.mesocyclesUnlimited')}</Feature>
                ) : coach.maxMesocycles > 0 ? (
                    <Feature on>{t('features.mesocyclesLimited', { count: coach.maxMesocycles })}</Feature>
                ) : null}
                <Feature on={coach.ai}>{t('features.ai')}</Feature>
            </ul>
        </section>
    )
}

/** What the user is on right now in this audience, and the two things they can do. */
function CurrentPlan({
    subscription,
    planSlug,
    audience,
}: {
    subscription: MySubscription | null
    planSlug: string
    audience: PlanAudience
}) {
    const t = useTranslations('billing')
    const locale = useLocale()
    const toMessage = useErrorMessage()
    const cancel = useCancelSubscription(audience)
    const resume = useResumeSubscription(audience)
    const [confirming, setConfirming] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // The gateway's own portal, for THIS plan's payment method. Only asked for when
    // there is something to manage (a gateway-billed subscription); null for gateways
    // with no portal (PayPal) so the button hides.
    const isManageable = subscription != null && subscription.gateway !== 'manual'
    const { data: portalUrl } = useBillingPortalUrl(audience, isManageable)

    const endsOn = subscription ? formatNumericDate(subscription.currentPeriodEnd, locale) : null

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
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    {subscription.cancelAtPeriodEnd && subscription.canResume ? (
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
                    {/* Manage the card for THIS plan's gateway. With two plans on two
                        gateways, each opens its own portal. */}
                    {portalUrl ? (
                        <TrackedLink
                            analyticsId="billing-portal"
                            href={portalUrl}
                            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text"
                        >
                            {t('paymentMethod')}
                            <ArrowUpRight className="size-4" />
                        </TrackedLink>
                    ) : null}
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
                // PayPal's cancellation is terminal: say so before they click, rather
                // than hiding a "resume" button afterwards and letting them find out.
                description={
                    subscription?.canResume
                        ? t('cancelBody', { date: endsOn ?? '' })
                        : t('cancelBodyTerminal', { date: endsOn ?? '' })
                }
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
    const gateways = price?.gateways ?? []
    const offer = plan.offer

    const buy = (gateway: string) => {
        setError(null)
        if (!price) return

        // Someone who already pays IN THIS AUDIENCE switches plan; they do not buy a
        // second one. (The subscription passed in is this tab's audience.)
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
                {plan.maxWorkouts === null ? (
                    <Feature on>{t('features.workoutsUnlimited')}</Feature>
                ) : plan.maxWorkouts > 0 ? (
                    <Feature on>{t('features.workoutsLimited', { count: plan.maxWorkouts })}</Feature>
                ) : null}
                {plan.maxTemplates === null ? (
                    <Feature on>{t('features.templatesUnlimited')}</Feature>
                ) : plan.maxTemplates > 0 ? (
                    <Feature on>{t('features.templatesLimited', { count: plan.maxTemplates })}</Feature>
                ) : null}
                {plan.maxMesocycles === null ? (
                    <Feature on>{t('features.mesocyclesUnlimited')}</Feature>
                ) : plan.maxMesocycles > 0 ? (
                    <Feature on>{t('features.mesocyclesLimited', { count: plan.maxMesocycles })}</Feature>
                ) : null}
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

            <div className="mt-5 space-y-2">
                {isCurrent ? (
                    <p className="rounded-full bg-white/[0.04] py-2.5 text-center text-sm text-text-faint">
                        {t('yourPlan')}
                    </p>
                ) : plan.isFree ? null : (
                    // One button per provider this deployment can actually charge with:
                    // the user picks how to pay, and a provider without keys never shows.
                    gateways.map((gateway, index) => (
                        <TrackedButton
                            key={gateway}
                            analyticsId={`billing-checkout-${gateway}`}
                            type="button"
                            disabled={!price || checkout.isPending || changePlan.isPending}
                            onClick={() => buy(gateway)}
                            className={
                                index === 0
                                    ? 'w-full rounded-full bg-ember-gradient py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50'
                                    : 'w-full rounded-full py-2.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text disabled:opacity-50'
                            }
                        >
                            {subscription
                                ? t('switchWith', { gateway: t(`gateway.${gateway}` as 'gateway.stripe') })
                                : t('subscribeWith', { gateway: t(`gateway.${gateway}` as 'gateway.stripe') })}
                        </TrackedButton>
                    ))
                )}
                {!plan.isFree && price && gateways.length === 0 ? (
                    <p className="text-center text-xs text-text-faint">{t('noGateway')}</p>
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
