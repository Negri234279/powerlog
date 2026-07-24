'use client'

import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { type AdminPlan, useAdminPlans, useReorderPlans } from '@/lib/graphql/hooks/use-admin-billing'
import { AdminTabs } from '@/components/admin/admin-tabs'
import { PlanCard } from '@/components/admin/plans/plan-card'
import { PlanModal } from '@/components/admin/plans/plan-modal'
import { STATUSES } from '@/components/admin/plans/shared'
import { Plus } from '@/components/ui/icons'
import { MultiSelect } from '@/components/ui/multi-select'
import { Skeleton } from '@/components/ui/skeleton'
import { SlidingTabs } from '@/components/ui/sliding-tabs'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { TrackedButton } from '@/components/ui/tracked'

const AUDIENCES = ['athlete', 'coach'] as const

/** Every plan-list filter in one object. Status defaults to `active` so the list
 *  opens on the plans that are actually live; extra facets can join this shape. */
interface PlanFilters {
    statuses: string[]
}

const INITIAL_FILTERS: PlanFilters = { statuses: ['active'] }

export default function AdminPlansPage() {
    const t = useTranslations('admin')
    const [audience, setAudience] = useState<(typeof AUDIENCES)[number]>('athlete')
    const [filter, setFilter] = useState<PlanFilters>(INITIAL_FILTERS)
    const { data: plans, isLoading } = useAdminPlans(audience)
    const reorder = useReorderPlans(audience)
    const [editing, setEditing] = useState<AdminPlan | null>(null)
    const [creating, setCreating] = useState(false)

    // Client-side status filter — the catalog fetches every status. An empty
    // selection means "no constraint", so deselecting all shows everything.
    const visiblePlans = useMemo(
        () => (plans ?? []).filter((plan) => filter.statuses.length === 0 || filter.statuses.includes(plan.status)),
        [plans, filter.statuses],
    )

    // Swap a card with its neighbour and persist the whole audience's order — this is
    // the order the landing lays the plans out in. It moves the *visible* neighbours,
    // so a filtered view still reorders the obvious way; any filtered-out plans keep
    // their place between the two that swap.
    const movePlan = (plan: AdminPlan, direction: -1 | 1) => {
        if (!plans) return
        const visibleIndex = visiblePlans.findIndex((p) => p.id === plan.id)
        const neighbour = visiblePlans[visibleIndex + direction]
        if (!neighbour) return

        const ids = plans.map((p) => p.id)
        const from = ids.indexOf(plan.id)
        const to = ids.indexOf(neighbour.id)
        ids[from] = neighbour.id
        ids[to] = plan.id
        reorder.mutate(ids)
    }

    return (
        <div>
            <TextsReveal>
                <p className="font-mono text-eyebrow uppercase text-text-faint">{t('eyebrow')}</p>
                <h1 className="mt-1 font-display text-h2 tracking-tight">{t('plansTitle')}</h1>
            </TextsReveal>

            <div className="mt-8">
                <AdminTabs />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                    <SlidingTabs
                        analyticsId="admin-plans-audience"
                        items={AUDIENCES.map((value) => ({ value, label: t(`audience.${value}`) }))}
                        value={audience}
                        onChange={(value) => setAudience(value as (typeof AUDIENCES)[number])}
                    />
                    <MultiSelect
                        analyticsId="admin-plans-status"
                        label={t('filterStatus')}
                        ariaLabel={t('filterStatus')}
                        options={STATUSES.map((value) => ({
                            value,
                            label: t(`planStatusValue.${value}` as 'planStatusValue.draft'),
                        }))}
                        selected={filter.statuses}
                        onChange={(statuses) => setFilter((current) => ({ ...current, statuses }))}
                    />
                </div>
                <TrackedButton
                    analyticsId="admin-plan-create-open"
                    type="button"
                    onClick={() => setCreating(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-ember-gradient px-4 py-2 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98]"
                >
                    <Plus className="size-4" />
                    {t('planCreate')}
                </TrackedButton>
            </div>

            <div className="mt-6 space-y-3">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-2xl" />)
                ) : visiblePlans.length ? (
                    visiblePlans.map((plan, index) => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            onEdit={() => setEditing(plan)}
                            onMoveUp={() => movePlan(plan, -1)}
                            onMoveDown={() => movePlan(plan, 1)}
                            canMoveUp={index > 0}
                            canMoveDown={index < visiblePlans.length - 1}
                            reordering={reorder.isPending}
                        />
                    ))
                ) : (
                    <p className="text-sm text-text-faint">{t('plansEmpty')}</p>
                )}
            </div>

            {creating ? <PlanModal audience={audience} plans={plans ?? []} onClose={() => setCreating(false)} /> : null}
            {editing ? (
                <PlanModal audience={audience} plans={plans ?? []} initial={editing} onClose={() => setEditing(null)} />
            ) : null}
        </div>
    )
}
