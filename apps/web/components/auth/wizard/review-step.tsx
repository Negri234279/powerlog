'use client'

import { useLocale, useTranslations } from 'next-intl'

import type { PublicPlan } from '@/lib/graphql/hooks/use-billing'
import type { RegisterValues } from '@/lib/validation/auth'
import { FormError } from '@/components/ui/form-error'
import { TrackedButton } from '@/components/ui/tracked'
import { type Currency, type Interval, money, priceOf } from './shared'

/** The final step: a read-back of every choice, then the one action — create it. */
export function ReviewStep({
    athletePlan,
    coachPlan,
    interval,
    currency,
    account,
    pending,
    formError,
    onBack,
    onCreate,
}: {
    athletePlan: PublicPlan | null
    coachPlan: PublicPlan | null
    interval: Interval
    currency: Currency
    account: RegisterValues
    pending: boolean
    formError: string | null
    onBack: () => void
    onCreate: () => void
}) {
    const tw = useTranslations('auth.wizard')

    return (
        <div className="space-y-5">
            <div className="space-y-3">
                <Row label={tw('reviewAccount')} value={`@${account.username} · ${account.email}`} />
                {athletePlan ? (
                    <PlanRow
                        label={tw('reviewAthletePlan')}
                        plan={athletePlan}
                        interval={interval}
                        currency={currency}
                    />
                ) : null}
                {coachPlan ? (
                    <PlanRow label={tw('reviewCoachPlan')} plan={coachPlan} interval={interval} currency={currency} />
                ) : (
                    <Row label={tw('reviewCoachPlan')} value={tw('reviewNoCoach')} />
                )}
            </div>

            <FormError error={formError} />

            <div className="flex items-center gap-3 pt-2">
                <TrackedButton
                    analyticsId="wizard-review-back"
                    type="button"
                    onClick={onBack}
                    disabled={pending}
                    className="rounded-full px-5 py-3 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text disabled:opacity-60"
                >
                    {tw('back')}
                </TrackedButton>
                <TrackedButton
                    analyticsId="wizard-create-account"
                    type="button"
                    onClick={onCreate}
                    disabled={pending}
                    className="flex-1 rounded-full bg-ember-gradient px-6 py-3 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {tw('createAccount')}
                </TrackedButton>
            </div>
        </div>
    )
}

function PlanRow({
    label,
    plan,
    interval,
    currency,
}: {
    label: string
    plan: PublicPlan
    interval: Interval
    currency: Currency
}) {
    const t = useTranslations('billing')
    const tw = useTranslations('auth.wizard')
    const locale = useLocale()

    const price = plan.isFree ? null : priceOf(plan, interval, currency)
    const value = plan.isFree
        ? `${plan.name} · ${t('free')}`
        : price
          ? `${plan.name} · ${money(price.amountCents, price.currency, locale)} ${interval === 'month' ? tw('perMonth') : tw('perYear')}`
          : `${plan.name} · ${tw('notAvailable')}`

    return <Row label={label} value={value} />
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface px-4 py-3 ring-1 ring-hairline">
            <span className="font-mono text-eyebrow uppercase text-text-faint">{label}</span>
            <span className="text-right text-sm text-text">{value}</span>
        </div>
    )
}
