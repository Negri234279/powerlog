'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { type AdminPlan, useSetPlanStatus } from '@/lib/graphql/hooks/use-admin-billing'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { Select } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { ChevronDown } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'
import { CapPill } from './cap-pill'
import { Grant } from './grant'
import { PricePill } from './price-pill'
import { STATUSES } from './shared'
import { StatusPill } from './status-pill'
import { SyncButtons } from './sync-buttons'

export function PlanCard({
    plan,
    onEdit,
    onMoveUp,
    onMoveDown,
    canMoveUp,
    canMoveDown,
    reordering,
}: {
    plan: AdminPlan
    onEdit: () => void
    onMoveUp: () => void
    onMoveDown: () => void
    canMoveUp: boolean
    canMoveDown: boolean
    reordering: boolean
}) {
    const t = useTranslations('admin')
    const setStatus = useSetPlanStatus()
    const toMessage = useErrorMessage()
    const [error, setError] = useState<string | null>(null)

    const activePrices = plan.prices.filter((price) => price.active)

    const changeStatus = (status: string) => {
        setError(null)
        setStatus.mutate({ id: plan.id, status }, { onError: (err) => setError(toMessage(err)) })
    }

    return (
        <article className="rounded-2xl bg-surface p-5 ring-1 ring-hairline">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h2 className="font-display text-h4 tracking-tight">{plan.name}</h2>
                        <StatusPill status={plan.status} />
                        {plan.isFree ? (
                            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-eyebrow uppercase text-text-dim">
                                {t('planFree')}
                            </span>
                        ) : null}
                    </div>
                    <p className="mt-1 font-mono text-xs text-text-faint">{plan.slug}</p>
                    {plan.description ? <p className="mt-2 text-sm text-text-dim">{plan.description}</p> : null}
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                        <TrackedButton
                            analyticsId="admin-plan-move-up"
                            type="button"
                            onClick={onMoveUp}
                            disabled={!canMoveUp || reordering}
                            aria-label={t('planMoveUp')}
                            className="grid size-9 place-items-center rounded-full text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text disabled:opacity-30"
                        >
                            <ChevronDown className="size-4 rotate-180" />
                        </TrackedButton>
                        <TrackedButton
                            analyticsId="admin-plan-move-down"
                            type="button"
                            onClick={onMoveDown}
                            disabled={!canMoveDown || reordering}
                            aria-label={t('planMoveDown')}
                            className="grid size-9 place-items-center rounded-full text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text disabled:opacity-30"
                        >
                            <ChevronDown className="size-4" />
                        </TrackedButton>
                    </div>
                    <Select
                        aria-label={t('planStatus')}
                        value={plan.status}
                        disabled={setStatus.isPending}
                        onChange={(event) => changeStatus(event.target.value)}
                        className="w-36 py-2"
                    >
                        {STATUSES.map((status) => (
                            <option key={status} value={status}>
                                {t(`planStatusValue.${status}`)}
                            </option>
                        ))}
                    </Select>
                    <TrackedButton
                        analyticsId="admin-plan-edit-open"
                        type="button"
                        onClick={onEdit}
                        className="rounded-full px-3 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text"
                    >
                        {t('planEdit')}
                    </TrackedButton>
                </div>
            </div>

            <FormError error={error} />

            <div className="mt-4 flex flex-wrap items-center gap-2">
                <CapPill label={t('entitlements.maxTemplates')} cap={plan.snapshot.maxTemplates} />
                <CapPill label={t('entitlements.maxMesocycles')} cap={plan.snapshot.maxMesocycles} />
                <CapPill label={t('entitlements.maxWorkouts')} cap={plan.snapshot.maxWorkouts} />
                <Grant label={t('entitlements.ai')} on={plan.snapshot.ai} />
                {plan.audience === 'coach' ? (
                    <>
                        <Grant label={t('entitlements.planSessions')} on={plan.snapshot.planSessions} />
                        <CapPill label={t('entitlements.maxAthletes')} cap={plan.snapshot.maxAthletes} />
                    </>
                ) : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
                {activePrices.length ? (
                    activePrices.map((price) => <PricePill key={price.id} price={price} />)
                ) : (
                    <span className="text-xs text-text-faint">
                        {plan.isFree ? t('planNoPriceFree') : t('planNoPrice')}
                    </span>
                )}

                {/* Without this the catalog never reaches the providers, and a checkout
                    has nothing to point at. Re-running it IS the retry. */}
                {plan.isFree ? null : <SyncButtons plan={plan} />}
            </div>
        </article>
    )
}
