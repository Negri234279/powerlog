'use client'

import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { type PublicPlan } from '@/lib/graphql/hooks/use-billing'
import { cn } from '@/lib/cn'
import { track } from '@/lib/analytics/events'
import { gqlErrorCode } from '@/lib/graphql/error'
import { useBecomeCoach, useCoachInvitationPreview } from '@/lib/graphql/hooks/use-coaching'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useRegister } from '@/lib/graphql/hooks/use-auth'
import type { RegisterValues } from '@/lib/validation/auth'
import { Mark } from '@/components/ui/icons'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'
import { AccountStep } from './wizard/account-step'
import { type PaymentItem, PaymentStep } from './wizard/payment-step'
import { PlanStep } from './wizard/plan-step'
import { ReviewStep } from './wizard/review-step'
import { type Currency, type Interval, type WizardStep, chargeablePrice } from './wizard/shared'

// The four steps the progress dots track. `payment` runs after the account exists
// (a paid plan needs it), so it sits outside the counted flow.
const FLOW: WizardStep[] = ['account', 'athlete', 'coach', 'review']

/**
 * Sign-up wizard: fill in the account, pick an athlete plan, optionally a coach
 * plan, review, then create it. The account is only created on review (not on the
 * account step) because a paid plan's embedded checkout needs a user to attach the
 * subscription to — so a free sign-up ends at the dashboard, and a paid one hands
 * off to the payment step.
 */
export function RegisterWizard() {
    const tw = useTranslations('auth.wizard')
    const t = useTranslations('auth')
    const router = useRouter()
    const register = useRegister()
    const becomeCoach = useBecomeCoach()
    const errorMessage = useErrorMessage()

    // Invite-aware: an ?invite=<token> prefills the (locked) email and a suggested
    // handle from the pending invitation, so the athlete lands linked to the coach.
    const [inviteToken, setInviteToken] = useState<string | null>(null)
    useEffect(() => {
        setInviteToken(new URLSearchParams(window.location.search).get('invite'))
    }, [])
    const preview = useCoachInvitationPreview(inviteToken)
    const invited = Boolean(preview.data)

    const [step, setStep] = useState<WizardStep>('account')
    const [interval, setInterval] = useState<Interval>('month')
    const [currency, setCurrency] = useState<Currency>('EUR')
    const [athletePlan, setAthletePlan] = useState<PublicPlan | null>(null)
    const [coachEnabled, setCoachEnabled] = useState(false)
    const [coachPlan, setCoachPlan] = useState<PublicPlan | null>(null)
    const [account, setAccount] = useState<RegisterValues | null>(null)
    // Terms + Privacy consent, gated on the account step. Lifted here so it
    // survives stepping back and forth like the account fields do.
    const [acceptedTerms, setAcceptedTerms] = useState(false)
    const [formError, setFormError] = useState<string | null>(null)

    async function createAccount() {
        if (!account) return
        setFormError(null)
        try {
            await register.mutateAsync(account)
            track('user_registered', { method: 'password' })

            // A free coach plan promotes on the spot — becomeCoach re-issues the
            // session so the JWT carries role=coach immediately. A paid coach plan
            // waits for its webhook (handled from the payment step / plan page).
            if (coachEnabled && coachPlan?.isFree) await becomeCoach.mutateAsync()

            const athletePrice = chargeablePrice(athletePlan, interval, currency)
            const coachPrice = coachEnabled ? chargeablePrice(coachPlan, interval, currency) : null

            // Any paid plan hands off to the payment step; an all-free sign-up is done.
            if (athletePrice || coachPrice) setStep('payment')
            else router.replace('/dashboard')
        } catch (error) {
            track('auth_failed', { action: 'register', code: gqlErrorCode(error) })
            setFormError(errorMessage(error))
        }
    }

    const title = {
        athlete: tw('athleteTitle'),
        coach: tw('coachTitle'),
        account: tw('accountTitle'),
        review: tw('reviewTitle'),
        payment: tw('paymentTitle'),
    }[step]

    const subtitle = {
        athlete: tw('athleteSubtitle'),
        coach: tw('coachSubtitle'),
        account: tw('accountSubtitle'),
        review: tw('reviewSubtitle'),
        payment: tw('paymentSubtitle'),
    }[step]

    const wide = step === 'athlete' || step === 'coach'

    // The paid plans to charge for, in the order they're paid (athlete first). A free
    // plan contributes nothing; the payment step only runs when this is non-empty.
    const paymentQueue: PaymentItem[] = []
    const athletePrice = chargeablePrice(athletePlan, interval, currency)
    if (athletePlan && athletePrice) {
        paymentQueue.push({
            audience: 'athlete',
            price: athletePrice,
            offerId: athletePlan.offer?.id ?? null,
            planName: athletePlan.name,
        })
    }

    const coachPrice = coachEnabled ? chargeablePrice(coachPlan, interval, currency) : null
    if (coachPlan && coachPrice) {
        paymentQueue.push({
            audience: 'coach',
            price: coachPrice,
            offerId: coachPlan.offer?.id ?? null,
            planName: coachPlan.name,
        })
    }

    return (
        <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden px-6 py-16">
            <div className="orb left-1/2 top-[-12%] size-[480px] -translate-x-1/2 bg-ember" />

            <div className={cn('relative w-full', wide ? 'max-w-3xl' : 'max-w-md')}>
                <TrackedLink analyticsId="auth-logo" href="/" className="mb-8 flex items-center justify-center gap-2.5">
                    <span className="grid size-8 place-items-center rounded-xl bg-ember-gradient text-bg">
                        <Mark className="size-4.5" />
                    </span>
                    <span className="font-display text-lg font-semibold tracking-tight">powerlog</span>
                </TrackedLink>

                <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
                    <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-7 md:p-8">
                        <ProgressDots step={step} />
                        <h1 className="mt-4 font-display text-h2">{title}</h1>
                        <p className="mt-2 text-body text-text-dim">{subtitle}</p>

                        <div className="mt-7">
                            {step === 'athlete' ? (
                                <div className="space-y-6">
                                    <PlanStep
                                        audience="athlete"
                                        interval={interval}
                                        currency={currency}
                                        onInterval={setInterval}
                                        onCurrency={setCurrency}
                                        selected={athletePlan}
                                        onSelect={setAthletePlan}
                                    />
                                    <div className="flex items-center gap-3">
                                        <TrackedButton
                                            analyticsId="wizard-athlete-back"
                                            type="button"
                                            onClick={() => setStep('account')}
                                            className="rounded-full px-5 py-3 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text"
                                        >
                                            {tw('back')}
                                        </TrackedButton>
                                        <TrackedButton
                                            analyticsId="wizard-athlete-continue"
                                            type="button"
                                            disabled={!athletePlan}
                                            onClick={() => setStep('coach')}
                                            className="flex-1 rounded-full bg-ember-gradient px-6 py-3 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {tw('continue')}
                                        </TrackedButton>
                                    </div>
                                </div>
                            ) : null}

                            {step === 'coach' ? (
                                <CoachStep
                                    enabled={coachEnabled}
                                    onEnabledChange={(value) => {
                                        setCoachEnabled(value)
                                        if (!value) setCoachPlan(null)
                                    }}
                                    interval={interval}
                                    currency={currency}
                                    onInterval={setInterval}
                                    onCurrency={setCurrency}
                                    selected={coachPlan}
                                    onSelect={setCoachPlan}
                                    onBack={() => setStep('athlete')}
                                    onContinue={() => setStep('review')}
                                />
                            ) : null}

                            {step === 'account' ? (
                                <AccountStep
                                    defaults={account}
                                    invited={invited}
                                    prefillEmail={preview.data?.email ?? ''}
                                    prefillUsername={preview.data?.suggestedUsername ?? ''}
                                    coachUsername={preview.data?.coachUsername ?? null}
                                    accepted={acceptedTerms}
                                    onAcceptedChange={setAcceptedTerms}
                                    onDone={(values) => {
                                        setAccount(values)
                                        setStep('athlete')
                                    }}
                                />
                            ) : null}

                            {step === 'review' && account ? (
                                <ReviewStep
                                    athletePlan={athletePlan}
                                    coachPlan={coachEnabled ? coachPlan : null}
                                    interval={interval}
                                    currency={currency}
                                    account={account}
                                    pending={register.isPending || becomeCoach.isPending}
                                    formError={formError}
                                    onBack={() => setStep('coach')}
                                    onCreate={createAccount}
                                />
                            ) : null}

                            {step === 'payment' ? <PaymentStep queue={paymentQueue} /> : null}
                        </div>
                    </div>
                </div>

                {step === 'account' ? (
                    <p className="mt-6 text-center text-sm text-text-dim">
                        {t('register.haveAccount')}{' '}
                        <TrackedLink
                            analyticsId="register-login-link"
                            href="/login"
                            className="text-text underline-offset-4 hover:underline"
                        >
                            {t('register.login')}
                        </TrackedLink>
                    </p>
                ) : null}
            </div>
        </main>
    )
}

/** The dots for the four counted steps; `payment` shows them all done. */
function ProgressDots({ step }: { step: WizardStep }) {
    const tw = useTranslations('auth.wizard')
    const active = step === 'payment' ? FLOW.length : FLOW.indexOf(step)
    // Screen readers get "Step X of N"; the dots themselves are decorative.
    const current = Math.min(active + 1, FLOW.length)

    return (
        <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={FLOW.length}
            aria-valuenow={current}
            aria-valuetext={tw('progress', { step: current, total: FLOW.length })}
        >
            <div className="flex items-center gap-1.5" aria-hidden>
                {FLOW.map((name, index) => (
                    <span
                        key={name}
                        className={cn(
                            'h-1 rounded-full transition-all duration-300',
                            index <= active ? 'w-6 bg-ember' : 'w-3 bg-white/[0.08]',
                        )}
                    />
                ))}
            </div>
        </div>
    )
}

/** The optional coach step: a yes/no, and the coach catalog when it's yes. */
function CoachStep({
    enabled,
    onEnabledChange,
    interval,
    currency,
    onInterval,
    onCurrency,
    selected,
    onSelect,
    onBack,
    onContinue,
}: {
    enabled: boolean
    onEnabledChange: (value: boolean) => void
    interval: Interval
    currency: Currency
    onInterval: (value: Interval) => void
    onCurrency: (value: Currency) => void
    selected: PublicPlan | null
    onSelect: (plan: PublicPlan) => void
    onBack: () => void
    onContinue: () => void
}) {
    const tw = useTranslations('auth.wizard')

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-center gap-3">
                <Choice active={enabled} onClick={() => onEnabledChange(true)} analyticsId="wizard-coach-yes">
                    {tw('coachEnable')}
                </Choice>
                <Choice active={!enabled} onClick={() => onEnabledChange(false)} analyticsId="wizard-coach-no">
                    {tw('coachSkip')}
                </Choice>
            </div>

            {enabled ? (
                <PlanStep
                    audience="coach"
                    interval={interval}
                    currency={currency}
                    onInterval={onInterval}
                    onCurrency={onCurrency}
                    selected={selected}
                    onSelect={onSelect}
                />
            ) : null}

            <div className="flex items-center gap-3">
                <TrackedButton
                    analyticsId="wizard-coach-back"
                    type="button"
                    onClick={onBack}
                    className="rounded-full px-5 py-3 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text"
                >
                    {tw('back')}
                </TrackedButton>
                <TrackedButton
                    analyticsId="wizard-coach-continue"
                    type="button"
                    disabled={enabled && !selected}
                    onClick={onContinue}
                    className="flex-1 rounded-full bg-ember-gradient px-6 py-3 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {tw('continue')}
                </TrackedButton>
            </div>
        </div>
    )
}

function Choice({
    active,
    onClick,
    analyticsId,
    children,
}: {
    active: boolean
    onClick: () => void
    analyticsId: string
    children: React.ReactNode
}) {
    return (
        <TrackedButton
            analyticsId={analyticsId}
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                'rounded-full px-5 py-2.5 text-sm ring-1 transition-colors duration-300',
                active ? 'bg-ember/10 text-ember ring-ember/40' : 'text-text-dim ring-hairline hover:text-text',
            )}
        >
            {children}
        </TrackedButton>
    )
}
