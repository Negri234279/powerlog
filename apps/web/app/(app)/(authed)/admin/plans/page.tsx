'use client'

import { useTranslations } from 'next-intl'
import { type FormEvent, Fragment, useEffect, useId, useMemo, useState } from 'react'

import {
    type AdminPlan,
    type AdminPlanPrice,
    type EntitlementsJsonSchema,
    useAddPlanPrice,
    useAdminPlans,
    useCreatePlan,
    useDeactivatePlanPrice,
    useEntitlementsSchema,
    useReorderPlans,
    useSetPlanStatus,
    useUpdatePlan,
} from '@/lib/graphql/hooks/use-admin-billing'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useSyncPlanToGateway } from '@/lib/graphql/hooks/use-admin-gateways'
import { AdminTabs } from '@/components/admin/admin-tabs'
import { type EntitlementsValue, EntitlementsForm, emptyEntitlements } from '@/components/admin/entitlements-form'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { ChevronDown, Plus } from '@/components/ui/icons'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { SlidingTabs } from '@/components/ui/sliding-tabs'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { TrackedButton } from '@/components/ui/tracked'

const AUDIENCES = ['athlete', 'coach'] as const
const INTERVALS = ['month', 'quarter', 'semester', 'year'] as const
const CURRENCIES = ['EUR', 'USD'] as const
const STATUSES = ['draft', 'active', 'archived'] as const

/** Cents → what an admin reads. The API only ever deals in integer cents. */
function formatAmount(amountCents: number, currency: string, locale: string): string {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amountCents / 100)
}

export default function AdminPlansPage() {
    const t = useTranslations('admin')
    const [audience, setAudience] = useState<(typeof AUDIENCES)[number]>('athlete')
    const { data: plans, isLoading } = useAdminPlans(audience)
    const reorder = useReorderPlans(audience)
    const [editing, setEditing] = useState<AdminPlan | null>(null)
    const [creating, setCreating] = useState(false)

    // Swap a card with its neighbour and persist the whole audience's order — this is
    // the order the landing lays the plans out in.
    const movePlan = (index: number, direction: -1 | 1) => {
        if (!plans) return
        const target = index + direction
        if (target < 0 || target >= plans.length) return

        const ids = plans.map((plan) => plan.id)
        const from = ids[index]
        const to = ids[target]
        if (from === undefined || to === undefined) return

        ids[index] = to
        ids[target] = from
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
                <SlidingTabs
                    analyticsId="admin-plans-audience"
                    items={AUDIENCES.map((value) => ({ value, label: t(`audience.${value}`) }))}
                    value={audience}
                    onChange={(value) => setAudience(value as (typeof AUDIENCES)[number])}
                />
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
                ) : plans?.length ? (
                    plans.map((plan, index) => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            onEdit={() => setEditing(plan)}
                            onMoveUp={() => movePlan(index, -1)}
                            onMoveDown={() => movePlan(index, 1)}
                            canMoveUp={index > 0}
                            canMoveDown={index < plans.length - 1}
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

function PlanCard({
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

/** Publish the plan to a gateway. Shows whether it has ever been published there. */
function SyncButtons({ plan }: { plan: AdminPlan }) {
    const t = useTranslations('admin')
    const toMessage = useErrorMessage()
    const sync = useSyncPlanToGateway()
    const [error, setError] = useState<string | null>(null)

    return (
        <>
            {(['stripe', 'paypal'] as const).map((gateway, index) => {
                const published = gateway === 'stripe' ? plan.stripeProductId !== null : plan.paypalProductId !== null

                return (
                    <TrackedButton
                        key={gateway}
                        analyticsId={`admin-plan-sync-${gateway}`}
                        type="button"
                        disabled={sync.isPending}
                        onClick={() => {
                            setError(null)
                            sync.mutate({ planId: plan.id, gateway }, { onError: (err) => setError(toMessage(err)) })
                        }}
                        className={`${index === 0 ? 'ml-auto' : ''} rounded-full px-3 py-1.5 text-xs ring-1 transition-colors duration-300 disabled:opacity-50 ${
                            published
                                ? 'text-ember ring-ember/30 hover:text-ember'
                                : 'text-text-dim ring-hairline hover:text-text'
                        }`}
                    >
                        {published ? t('planSynced', { gateway }) : t('planSync', { gateway })}
                    </TrackedButton>
                )
            })}
            <FormError error={error} />
        </>
    )
}

function StatusPill({ status }: { status: string }) {
    const t = useTranslations('admin')
    const tone =
        status === 'active'
            ? 'bg-ember/15 text-ember'
            : status === 'archived'
              ? 'bg-white/[0.04] text-text-faint'
              : 'bg-white/[0.06] text-text-dim'

    return (
        <span className={`rounded-full px-2 py-0.5 font-mono text-eyebrow uppercase ${tone}`}>
            {t(`planStatusValue.${status}` as 'planStatusValue.draft')}
        </span>
    )
}

function Grant({ label, on }: { label: string; on: boolean }) {
    return (
        <span
            className={`rounded-full px-3 py-1 font-mono text-eyebrow uppercase ${
                on ? 'bg-ember/10 text-ember' : 'bg-white/[0.03] text-text-faint line-through'
            }`}
        >
            {label}
        </span>
    )
}

/** A numeric cap: `∞` when null (unlimited), the number otherwise; 0 reads as "off". */
function CapPill({ label, cap }: { label: string; cap: number | null }) {
    const off = cap === 0

    return (
        <span
            className={`rounded-full px-3 py-1 font-mono text-eyebrow uppercase ${
                off ? 'bg-white/[0.03] text-text-faint line-through' : 'bg-ember/10 text-ember'
            }`}
        >
            {label}: {cap === null ? '∞' : cap}
        </span>
    )
}

function PricePill({ price }: { price: AdminPlanPrice }) {
    const t = useTranslations('admin')

    return (
        <span className="rounded-full bg-white/[0.04] px-3 py-1 font-mono text-xs text-text-dim">
            {formatAmount(price.amountCents, price.currency, 'en')} /{' '}
            {t(`interval.${price.interval}` as 'interval.month')}
        </span>
    )
}

/**
 * Create or edit a plan — base info and prices in one place, split into two tabs.
 *
 * A price needs a plan to hang on (`addPlanPrice` takes a `planId`), so a brand-new
 * plan can't have prices until it exists. The create path handles that seam: the
 * prices tab only appears once the plan is saved, and creating it advances straight
 * there. The entitlements editor builds itself from the API's schema.
 */
function PlanModal({
    audience,
    plans,
    initial,
    onClose,
}: {
    audience: string
    plans: AdminPlan[]
    initial?: AdminPlan
    onClose: () => void
}) {
    const t = useTranslations('admin')
    const toMessage = useErrorMessage()
    const { data: schema } = useEntitlementsSchema(initial?.audience ?? audience)
    const create = useCreatePlan()
    const update = useUpdatePlan()
    const addPrice = useAddPlanPrice()

    // Null until the plan exists. Set on create, so a price publish (and later edits)
    // can hang on the freshly-minted plan without closing the modal.
    const [planId, setPlanId] = useState<string | null>(initial?.id ?? null)
    const [tab, setTab] = useState<'info' | 'prices'>('info')

    const [name, setName] = useState(initial?.name ?? '')
    const [slug, setSlug] = useState(initial?.slug ?? '')
    const [description, setDescription] = useState(initial?.description ?? '')
    const [entitlements, setEntitlements] = useState<EntitlementsValue>(
        (initial?.entitlements as EntitlementsValue | undefined) ?? {},
    )
    // The price matrix while creating — there's no plan to hang prices on yet, so they
    // ride along and get published right after the plan is born.
    const [priceDraft, setPriceDraft] = useState<Record<string, string>>({})
    // Explicit intent for a plan with no prices. Without this an empty matrix would slip
    // through as a free plan by accident; ticking it is what unlocks a priceless create.
    const [free, setFree] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)

    // A fresh plan starts from the schema's own empty shape; an existing one from
    // whatever it already grants.
    useEffect(() => {
        if (!schema || initial) return
        setEntitlements(emptyEntitlements(schema))
    }, [schema, initial])

    // Any edit clears the "saved" confirmation; a successful save unchanged fields
    // won't refire this, so the tick stays until the admin actually touches something.
    useEffect(() => {
        setSaved(false)
    }, [name, description, entitlements])

    // The prices tab reads the plan live from the refreshed catalog by id, so a price
    // added moments ago shows without reopening — and the just-created plan appears
    // the instant the list refetches.
    const plan = planId ? (plans.find((p) => p.id === planId) ?? initial ?? null) : null

    const onUpdate = (event: FormEvent) => {
        event.preventDefault()
        setError(null)
        if (!planId) return

        update.mutate(
            { id: planId, name, description: description || null, entitlements },
            { onSuccess: () => setSaved(true), onError: (err) => setError(toMessage(err)) },
        )
    }

    // Create the plan, then publish whatever the price matrix was filled with. If a
    // price fails, the plan already exists (planId is set) so the modal flips to edit
    // mode on the prices tab, where the live table lets the admin finish.
    const onCreate = async (event: FormEvent) => {
        event.preventDefault()
        setError(null)

        if (!name.trim() || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length < 3) {
            setTab('info')
            setError(t('planBaseInvalid'))
            return
        }

        const prices = free ? [] : filledPrices(priceDraft)

        // A paid plan with nothing filled is almost always a forgotten price, not an
        // intended free plan — make the admin say which by ticking the box.
        if (!free && prices.length === 0) {
            setTab('prices')
            setError(t('planNeedsPrice'))
            return
        }
        if (!free && hasInvalidAmount(priceDraft)) {
            setTab('prices')
            setError(t('planPriceInvalid'))
            return
        }

        let created = false
        try {
            const newId = await create.mutateAsync({
                audience,
                slug,
                name,
                description: description || null,
                entitlements,
                isFree: free,
            })
            created = true
            setPlanId(newId)

            for (const price of prices) await addPrice.mutateAsync({ planId: newId, ...price })

            onClose()
        } catch (err) {
            setError(toMessage(err))
            if (created) setTab('prices')
        }
    }

    const creating = create.isPending || addPrice.isPending

    return (
        <Modal open onClose={onClose} className="max-w-xl">
            <div className="space-y-4">
                <h2 className="font-display text-h4 tracking-tight">
                    {planId ? t('planEditTitle') : t('planCreateTitle')}
                </h2>

                <SlidingTabs
                    analyticsId="admin-plan-tab"
                    items={[
                        { value: 'info', label: t('planTabInfo') },
                        { value: 'prices', label: t('planPrices') },
                    ]}
                    value={tab}
                    onChange={(value) => setTab(value as 'info' | 'prices')}
                />

                {planId ? (
                    // Existing plan: base info and the live price table are saved
                    // independently, each on its own tab.
                    tab === 'info' ? (
                        <form onSubmit={onUpdate} className="space-y-4">
                            <PlanBaseFields
                                schema={schema}
                                name={name}
                                setName={setName}
                                slug={slug}
                                setSlug={setSlug}
                                showSlug={false}
                                description={description}
                                setDescription={setDescription}
                                entitlements={entitlements}
                                setEntitlements={setEntitlements}
                                liveNote={initial?.status === 'active'}
                            />

                            <FormError error={error} />

                            <div className="flex items-center gap-2">
                                <TrackedButton
                                    analyticsId="admin-plan-cancel"
                                    type="button"
                                    onClick={onClose}
                                    className="w-full rounded-full px-6 py-3 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text"
                                >
                                    {t('cancel')}
                                </TrackedButton>
                                <div className="flex w-full items-center justify-end gap-3">
                                    {saved ? (
                                        <span
                                            className="font-mono text-eyebrow uppercase text-ember"
                                            aria-live="polite"
                                        >
                                            {t('planSaved')}
                                        </span>
                                    ) : null}
                                    <SubmitButton
                                        analyticsId="admin-plan-save"
                                        loading={update.isPending}
                                        disabled={!schema}
                                    >
                                        {t('save')}
                                    </SubmitButton>
                                </div>
                            </div>
                        </form>
                    ) : plan ? (
                        <PricesPanel plan={plan} onClose={onClose} />
                    ) : (
                        <Skeleton className="h-40 rounded-2xl" />
                    )
                ) : (
                    // New plan: base info and prices are filled together, then created
                    // and published in one submit. One form, the tabs swap which half shows.
                    // The inactive half is unmounted (not just hidden) so a `required` field
                    // it holds can't silently block a submit fired from the other tab.
                    <form onSubmit={onCreate} className="space-y-4">
                        {tab === 'info' ? (
                            <PlanBaseFields
                                schema={schema}
                                name={name}
                                setName={setName}
                                slug={slug}
                                setSlug={setSlug}
                                showSlug
                                description={description}
                                setDescription={setDescription}
                                entitlements={entitlements}
                                setEntitlements={setEntitlements}
                                liveNote={false}
                            />
                        ) : (
                            <div className="space-y-3">
                                <FreeToggle checked={free} onChange={setFree} />
                                {free ? (
                                    <p className="text-xs text-text-faint">{t('planNoPriceFree')}</p>
                                ) : (
                                    <>
                                        <p className="text-xs text-text-faint">{t('planPricesHint')}</p>
                                        <PriceMatrix
                                            draft={priceDraft}
                                            onChange={(key, value) =>
                                                setPriceDraft((current) => ({ ...current, [key]: value }))
                                            }
                                        />
                                    </>
                                )}
                            </div>
                        )}

                        <FormError error={error} />

                        <div className="flex items-center gap-2">
                            <TrackedButton
                                analyticsId="admin-plan-cancel"
                                type="button"
                                onClick={onClose}
                                className="w-full rounded-full px-6 py-3 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text"
                            >
                                {t('cancel')}
                            </TrackedButton>
                            <SubmitButton analyticsId="admin-plan-save" loading={creating} disabled={!schema}>
                                {t('planCreateSubmit')}
                            </SubmitButton>
                        </div>
                    </form>
                )}
            </div>
        </Modal>
    )
}

/** The plan's base info: name, (optional) slug, description and the schema-driven grants. */
function PlanBaseFields({
    schema,
    name,
    setName,
    slug,
    setSlug,
    showSlug,
    description,
    setDescription,
    entitlements,
    setEntitlements,
    liveNote,
}: {
    schema?: EntitlementsJsonSchema
    name: string
    setName: (value: string) => void
    slug: string
    setSlug: (value: string) => void
    showSlug: boolean
    description: string
    setDescription: (value: string) => void
    entitlements: EntitlementsValue
    setEntitlements: (value: EntitlementsValue) => void
    liveNote: boolean
}) {
    const t = useTranslations('admin')

    return (
        <div className="space-y-4">
            <Field label={t('planName')}>
                <Input value={name} onChange={(event) => setName(event.target.value)} required maxLength={60} />
            </Field>

            {showSlug ? (
                <Field label={t('planSlug')} hint={t('planSlugHint')}>
                    <Input
                        value={slug}
                        onChange={(event) => setSlug(event.target.value)}
                        required
                        pattern="[a-z0-9]+(-[a-z0-9]+)*"
                        minLength={3}
                        maxLength={40}
                    />
                </Field>
            ) : null}

            <Field label={t('planDescription')}>
                <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={500}
                />
            </Field>

            <div className="space-y-2">
                <p className="font-mono text-eyebrow uppercase text-text-dim">{t('planEntitlements')}</p>
                {schema ? (
                    <EntitlementsForm schema={schema} value={entitlements} onChange={setEntitlements} />
                ) : (
                    <Skeleton className="h-24 rounded-2xl" />
                )}
                {liveNote ? <p className="text-xs text-text-faint">{t('planEntitlementsLive')}</p> : null}
            </div>
        </div>
    )
}

/** The editable interval × currency price grid (major units). Purely presentational. */
function PriceMatrix({
    draft,
    onChange,
}: {
    draft: Record<string, string>
    onChange: (key: string, value: string) => void
}) {
    const t = useTranslations('admin')

    return (
        <div className="overflow-x-auto">
            <div className="grid min-w-[19rem] grid-cols-[4.5rem_1fr_1fr] items-center gap-2">
                <span />
                {CURRENCIES.map((currency) => (
                    <span key={currency} className="px-1 text-center font-mono text-eyebrow uppercase text-text-dim">
                        {currency}
                    </span>
                ))}

                {INTERVALS.map((interval) => (
                    <Fragment key={interval}>
                        <span className="font-mono text-eyebrow uppercase text-text-faint">
                            {t(`interval.${interval}` as 'interval.month')}
                        </span>
                        {CURRENCIES.map((currency) => {
                            const key = `${interval}-${currency}`

                            return (
                                <Input
                                    key={currency}
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    inputMode="decimal"
                                    placeholder="—"
                                    aria-label={`${t(`interval.${interval}` as 'interval.month')} ${currency}`}
                                    value={draft[key] ?? ''}
                                    onChange={(event) => onChange(key, event.target.value)}
                                    className="px-3 py-2 text-center text-sm"
                                />
                            )
                        })}
                    </Fragment>
                ))}
            </div>
        </div>
    )
}

/** The prices filled into a matrix draft, as publishable rows (empty cells skipped). */
function filledPrices(draft: Record<string, string>): { interval: string; currency: string; amountCents: number }[] {
    const rows: { interval: string; currency: string; amountCents: number }[] = []

    for (const interval of INTERVALS)
        for (const currency of CURRENCIES) {
            const raw = (draft[`${interval}-${currency}`] ?? '').trim()
            if (raw === '') continue

            rows.push({ interval, currency, amountCents: Math.round(Number(raw) * 100) })
        }

    return rows
}

/** True if any non-empty cell isn't a valid amount above zero. */
function hasInvalidAmount(draft: Record<string, string>): boolean {
    for (const interval of INTERVALS)
        for (const currency of CURRENCIES) {
            const raw = (draft[`${interval}-${currency}`] ?? '').trim()
            if (raw === '') continue
            if (!Number.isFinite(Number(raw)) || Math.round(Number(raw) * 100) < 1) return true
        }

    return false
}

/**
 * "This plan has no prices" confirmation. Editable while creating (it sets `isFree`);
 * a plan's free status is fixed at birth, so it shows locked when editing.
 */
function FreeToggle({
    checked,
    onChange,
    disabled = false,
}: {
    checked: boolean
    onChange?: (checked: boolean) => void
    disabled?: boolean
}) {
    const t = useTranslations('admin')
    const id = useId()

    return (
        <div className="rounded-2xl bg-bg/40 p-4 ring-1 ring-hairline">
            <div className="flex items-center gap-3">
                <input
                    id={id}
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={(event) => onChange?.(event.target.checked)}
                    className="size-4 accent-ember disabled:opacity-50"
                />
                <label htmlFor={id} className="text-sm text-text-dim">
                    {t('planFreeConfirm')}
                </label>
            </div>
            {disabled ? <p className="mt-1.5 pl-7 text-xs text-text-faint">{t('planFreeLocked')}</p> : null}
        </div>
    )
}

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
function PricesPanel({ plan, onClose }: { plan: AdminPlan; onClose: () => void }) {
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
        for (const interval of INTERVALS)
            for (const currency of CURRENCIES) {
                const price = activeFor(interval, currency)
                seed[`${interval}-${currency}`] = price ? String(price.amountCents / 100) : ''
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
                if (change.type === 'publish')
                    await addPrice.mutateAsync({
                        planId: plan.id,
                        interval: change.interval,
                        currency: change.currency,
                        amountCents: change.amountCents,
                    })
                else await deactivate.mutateAsync(change.priceId)
            }
            setConfirming(false)
        } catch (err) {
            setError(toMessage(err))
            setConfirming(false)
        }
    }

    const onSubmit = (event: FormEvent) => {
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
