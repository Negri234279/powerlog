'use client'

import { useTranslations } from 'next-intl'
import { type SubmitEvent, useMemo, useState } from 'react'

import { type AdminPlan, useAddPlanPrice, useDeactivatePlanPrice } from '@/lib/graphql/hooks/use-admin-billing'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { FormError } from '@/components/ui/form-error'
import { SubmitButton } from '@/components/ui/submit-button'
import { TrackedButton } from '@/components/ui/tracked'
import { FreeToggle } from './free-toggle'
import { PriceMatrix } from './price-matrix'
import { CURRENCIES, formatAmount, hasInvalidAmount, INTERVALS } from './shared'

/** One cell's intent when the admin saves the price table. */
type PriceChange =
    | { type: 'publish'; interval: string; currency: string; amountCents: number }
    | { type: 'withdraw'; interval: string; currency: string; priceId: string }

/**
 * Every price at a glance: a matrix of interval × currency, each cell pre-filled
 * with what's on sale. Editing a cell and saving publishes a new version (which
 * withdraws the one it replaces); clearing a cell withdraws it — subscribers on it
 * keep their price, so that case is confirmed. Everything applies in one save.
 */
export function PricesPanel({ plan, onClose }: { plan: AdminPlan; onClose: () => void }) {
    const t = useTranslations('admin')
    const toMessage = useErrorMessage()
    const addPrice = useAddPlanPrice()
    const deactivate = useDeactivatePlanPrice()

    const activeFor = (interval: string, currency: string) =>
        plan.prices.find((price) => price.active && price.interval === interval && price.currency === currency)

    // The editable matrix, seeded from what's on sale (major units). After a save the
    // catalog refetches, but the draft already mirrors what was submitted, so it stays
    // in sync without re-seeding.
    const [draft, setDraft] = useState<Record<string, string>>(() => {
        const seed: Record<string, string> = {}

        for (const interval of INTERVALS) {
            for (const currency of CURRENCIES) {
                const price = activeFor(interval, currency)
                seed[`${interval}-${currency}`] = price ? String(price.amountCents / 100) : ''
            }
        }

        return seed
    })
    const [error, setError] = useState<string | null>(null)
    const [confirming, setConfirming] = useState(false)

    const withdrawn = useMemo(() => plan.prices.filter((price) => !price.active), [plan.prices])
    const pending = addPrice.isPending || deactivate.isPending

    // What the table would change vs. what's on sale now.
    const changes = useMemo<PriceChange[]>(() => {
        const list: PriceChange[] = []

        for (const interval of INTERVALS)
            for (const currency of CURRENCIES) {
                const current = plan.prices.find(
                    (price) => price.active && price.interval === interval && price.currency === currency,
                )
                const raw = (draft[`${interval}-${currency}`] ?? '').trim()

                if (raw === '') {
                    if (current) list.push({ type: 'withdraw', interval, currency, priceId: current.id })
                    continue
                }

                const amountCents = Math.round(Number(raw) * 100)
                if (!current || current.amountCents !== amountCents)
                    list.push({ type: 'publish', interval, currency, amountCents })
            }
        return list
    }, [draft, plan.prices])

    const withdrawals = changes.filter((change) => change.type === 'withdraw')

    // Publishing withdraws the prior version for that interval+currency on its own; a
    // cleared cell is the only truly destructive move, so that's the one we confirm.
    const apply = async () => {
        setError(null)

        try {
            for (const change of changes) {
                if (change.type === 'publish') {
                    await addPrice.mutateAsync({
                        planId: plan.id,
                        interval: change.interval,
                        currency: change.currency,
                        amountCents: change.amountCents,
                    })
                } else {
                    await deactivate.mutateAsync(change.priceId)
                }
            }

            setConfirming(false)
        } catch (err) {
            setError(toMessage(err))
            setConfirming(false)
        }
    }

    const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)
        if (!changes.length) return

        if (hasInvalidAmount(draft)) {
            setError(t('planPriceInvalid'))
            return
        }

        if (withdrawals.length) {
            setConfirming(true)
            return
        }

        void apply()
    }

    return (
        <div className="space-y-5">
            <FreeToggle checked={plan.isFree} disabled />

            {plan.isFree ? (
                <p className="text-sm text-text-faint">{t('planNoPriceFree')}</p>
            ) : (
                <>
                    <p className="text-xs text-text-faint">{t('planPricesHint')}</p>

                    <form onSubmit={onSubmit} className="space-y-4">
                        <PriceMatrix
                            draft={draft}
                            onChange={(key, value) => setDraft((current) => ({ ...current, [key]: value }))}
                        />

                        <FormError error={error} />

                        <SubmitButton analyticsId="admin-prices-save" loading={pending} disabled={changes.length === 0}>
                            {t('planPricesSave')}
                        </SubmitButton>
                    </form>

                    {withdrawn.length ? (
                        <div className="border-t border-hairline pt-5">
                            <p className="font-mono text-eyebrow uppercase text-text-dim">{t('planPriceHistory')}</p>
                            <ul className="mt-2 space-y-1">
                                {withdrawn.map((price) => (
                                    <li key={price.id} className="font-mono text-xs text-text-faint line-through">
                                        {formatAmount(price.amountCents, price.currency, 'en')} /{' '}
                                        {t(`interval.${price.interval}` as 'interval.month')}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : null}
                </>
            )}

            <TrackedButton
                analyticsId="admin-plan-done"
                type="button"
                onClick={onClose}
                className="w-full rounded-full px-6 py-3 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text"
            >
                {t('planDone')}
            </TrackedButton>

            <ConfirmModal
                open={confirming}
                onClose={() => setConfirming(false)}
                onConfirm={() => void apply()}
                title={t('planPriceWithdrawTitle')}
                description={t('planPriceWithdrawBody')}
                confirmLabel={t('planPricesSave')}
                cancelLabel={t('cancel')}
                destructive
                pending={pending}
                analyticsId="admin-price-withdraw"
            />
        </div>
    )
}
