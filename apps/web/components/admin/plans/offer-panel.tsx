'use client'

import { useTranslations } from 'next-intl'
import { type SubmitEvent, useState } from 'react'

import { type AdminPlan, useDeactivatePlanOffer, useUpsertPlanOffer } from '@/lib/graphql/hooks/use-admin-billing'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { FormError } from '@/components/ui/form-error'
import { SubmitButton } from '@/components/ui/submit-button'
import { TrackedButton } from '@/components/ui/tracked'
import { OfferFields } from './offer-fields'
import { type OfferDraft, offerInputFrom, seedOfferDraft, validateOfferDraft } from './shared'

/**
 * The plan's introductory offer: a free trial and/or a discounted opening phase,
 * plus the promo line buyers see. There is at most one live offer per plan; saving
 * **replaces** it (terms are immutable, so a change is a new offer), and after a
 * change the plan must be re-synced to the gateways for the coupon/plan to exist —
 * hence the reminder. A trial is honoured once per account; that limit is enforced
 * at checkout, nothing to configure here.
 */
export function OfferPanel({ plan, onClose }: { plan: AdminPlan; onClose: () => void }) {
    const t = useTranslations('admin')
    const toMessage = useErrorMessage()
    const upsert = useUpsertPlanOffer()
    const deactivate = useDeactivatePlanOffer()
    const offer = plan.offer

    const [draft, setDraft] = useState<OfferDraft>(() => seedOfferDraft(offer, t('offerDefaultName')))
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    const [confirming, setConfirming] = useState(false)

    const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)
        setSaved(false)

        // The API refuses an offer that grants nothing, and an intro phase needs both
        // halves — say so here instead of letting the round-trip fail.
        const invalid = validateOfferDraft(draft)
        if (invalid) {
            setError(t(invalid))
            return
        }

        upsert.mutate(offerInputFrom(plan.id, draft), {
            onSuccess: () => setSaved(true),
            onError: (err) => setError(toMessage(err)),
        })
    }

    const retire = () =>
        offer &&
        deactivate.mutate(offer.id, {
            onSuccess: () => setConfirming(false),
            onError: (err) => {
                setError(toMessage(err))
                setConfirming(false)
            },
        })

    return (
        <div className="space-y-5">
            {offer ? (
                <div className="rounded-2xl bg-ember/[0.06] p-4 ring-1 ring-ember/20">
                    <p className="font-mono text-eyebrow uppercase text-ember">{t('offerLive')}</p>
                    <p className="mt-1 text-sm text-text-dim">
                        {offer.message ||
                            [
                                offer.trialDays ? t('offerTrial', { days: offer.trialDays }) : null,
                                offer.introPhase ? t('offerDiscount', { percent: offer.introPhase.percentOff }) : null,
                            ]
                                .filter(Boolean)
                                .join(' · ')}
                    </p>
                </div>
            ) : (
                <p className="text-sm text-text-faint">{t('offerNone')}</p>
            )}

            <p className="text-xs text-text-faint">{t('offerHint')}</p>

            <form onSubmit={onSubmit} className="space-y-4">
                <OfferFields value={draft} onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))} />

                <p className="rounded-xl bg-white/[0.03] px-3 py-2 text-xs text-text-faint">{t('offerSyncHint')}</p>

                <FormError error={error} />

                <div className="flex items-center justify-end gap-3">
                    {saved ? (
                        <span className="font-mono text-eyebrow uppercase text-ember" aria-live="polite">
                            {t('planSaved')}
                        </span>
                    ) : null}
                    <SubmitButton analyticsId="admin-offer-save" loading={upsert.isPending}>
                        {t('offerSave')}
                    </SubmitButton>
                </div>
            </form>

            {offer ? (
                <TrackedButton
                    analyticsId="admin-offer-retire-open"
                    type="button"
                    onClick={() => setConfirming(true)}
                    disabled={deactivate.isPending}
                    className="w-full rounded-full px-6 py-3 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text disabled:opacity-50"
                >
                    {t('offerRetire')}
                </TrackedButton>
            ) : null}

            <TrackedButton
                analyticsId="admin-offer-done"
                type="button"
                onClick={onClose}
                className="w-full rounded-full px-6 py-3 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text"
            >
                {t('planDone')}
            </TrackedButton>

            <ConfirmModal
                open={confirming}
                onClose={() => setConfirming(false)}
                onConfirm={retire}
                title={t('offerRetireTitle')}
                description={t('offerRetireBody')}
                confirmLabel={t('offerRetire')}
                cancelLabel={t('cancel')}
                destructive
                pending={deactivate.isPending}
                analyticsId="admin-offer-retire"
            />
        </div>
    )
}
