'use client'

import { useTranslations } from 'next-intl'
import { type SubmitEvent, Activity, Fragment, useEffect, useId, useMemo, useState } from 'react'

import {
    type AdminPlan,
    type AdminPlanPrice,
    type EntitlementsJsonSchema,
    type PlanTranslationInput,
    type UpsertPlanOfferInput,
    useAddPlanPrice,
    useAdminPlans,
    useCreatePlan,
    useDeactivatePlanOffer,
    useDeactivatePlanPrice,
    useEntitlementsSchema,
    useReorderPlans,
    useSetPlanStatus,
    useUpdatePlan,
    useUpsertPlanOffer,
} from '@/lib/graphql/hooks/use-admin-billing'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useSyncPlanToGateway } from '@/lib/graphql/hooks/use-admin-gateways'
import { fieldErrors } from '@/lib/validation/errors'
import { planCreateSchema } from '@/lib/validation/plan'
import { AdminTabs } from '@/components/admin/admin-tabs'
import { type EntitlementsValue, EntitlementsForm, emptyEntitlements } from '@/components/admin/entitlements-form'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { ChevronDown, Plus, Spinner } from '@/components/ui/icons'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { SlidingTabs } from '@/components/ui/sliding-tabs'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { TrackedButton } from '@/components/ui/tracked'

const AUDIENCES = ['athlete', 'coach'] as const
// Non-default locales the plan can be translated into. The base name/description on
// the Plan tab are the default (English) and the fallback.
const TRANSLATION_LOCALES = ['es'] as const
type TranslationDraft = Record<string, { name: string; description: string }>
const INTERVALS = ['month', 'quarter', 'semester', 'year'] as const
const CURRENCIES = ['EUR', 'USD'] as const
const STATUSES = ['draft', 'active', 'archived'] as const

// An offer needs a saved plan (FK). In edit mode it's live via OfferPanel; in create it
// rides along as a draft and publishes right after the plan is born (like prices).
type PlanTab = 'info' | 'prices' | 'translations' | 'offer'

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
                // Both buttons share one mutation, so `isPending` alone can't tell them
                // apart — match the in-flight variables to spin only the clicked gateway.
                const syncing = sync.isPending && sync.variables?.gateway === gateway

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
                        className={`${index === 0 ? 'ml-auto' : ''} inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs ring-1 transition-colors duration-300 disabled:opacity-50 ${
                            published
                                ? 'text-ember ring-ember/30 hover:text-ember'
                                : 'text-text-dim ring-hairline hover:text-text'
                        }`}
                    >
                        {syncing ? (
                            <>
                                <Spinner className="size-3.5" />
                                {t('planSyncing')}
                            </>
                        ) : published ? (
                            t('planSynced', { gateway })
                        ) : (
                            t('planSync', { gateway })
                        )}
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
    const upsertOffer = useUpsertPlanOffer()

    // Null until the plan exists. Set on create, so a price publish (and later edits)
    // can hang on the freshly-minted plan without closing the modal.
    const [planId, setPlanId] = useState<string | null>(initial?.id ?? null)
    const [tab, setTab] = useState<PlanTab>('info')

    const [name, setName] = useState(initial?.name ?? '')
    const [slug, setSlug] = useState(initial?.slug ?? '')
    const [description, setDescription] = useState(initial?.description ?? '')
    // Localized name/description per non-default locale, seeded from what's saved.
    const [translations, setTranslations] = useState<TranslationDraft>(() => seedTranslations(initial))
    const [entitlements, setEntitlements] = useState<EntitlementsValue>(
        (initial?.entitlements as EntitlementsValue | undefined) ?? {},
    )
    // The price matrix while creating — there's no plan to hang prices on yet, so they
    // ride along and get published right after the plan is born.
    const [priceDraft, setPriceDraft] = useState<Record<string, string>>({})
    // Explicit intent for a plan with no prices. Without this an empty matrix would slip
    // through as a free plan by accident; ticking it is what unlocks a priceless create.
    const [free, setFree] = useState(false)
    // Editorial "recommended" badge on the pricing card. Display only — never a grant.
    const [highlighted, setHighlighted] = useState(initial?.highlighted ?? false)
    // The offer draft while creating — an offer needs a saved plan (FK), so like prices it
    // rides along and is published right after the plan is born. Optional: left untouched ⇒
    // no offer. In edit mode the offer tab uses OfferPanel, not this draft.
    const [offerDraft, setOfferDraft] = useState<OfferDraft>(() =>
        seedOfferDraft(initial?.offer ?? null, t('offerDefaultName')),
    )
    const [error, setError] = useState<string | null>(null)
    const [saved, setSaved] = useState(false)
    // Per-field validation for the create flow: the `planCreateSchema` (zod) runs on
    // submit and this holds `{ field: messageKey }`, so every bad field lights up red
    // inline at once instead of the browser's native single-field popup. Same shape as
    // the auth forms (`errors` + `fieldErrors()`). Keys translate via `t(key)`.
    const [errors, setErrors] = useState<Record<string, string>>({})

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

    const onUpdate = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)
        if (!planId) return

        update.mutate(
            { id: planId, name, description: description || null, entitlements, highlighted },
            { onSuccess: () => setSaved(true), onError: (err) => setError(toMessage(err)) },
        )
    }

    const onUpdateTranslations = (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)
        if (!planId) return

        update.mutate(
            { id: planId, translations: translationPayload(translations) },
            { onSuccess: () => setSaved(true), onError: (err) => setError(toMessage(err)) },
        )
    }

    // Create the plan, then publish whatever the price matrix was filled with. If a
    // price fails, the plan already exists (planId is set) so the modal flips to edit
    // mode on the prices tab, where the live table lets the admin finish.
    const onCreate = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)

        // Validate the whole form in one pass. `fieldErrors` collects every issue, so
        // all bad fields light up together; we jump to the first tab that holds one
        // (info fields and prices sit on separate tabs, only one mounted at a time).
        const parsed = planCreateSchema.safeParse({ name, slug, free, prices: priceDraft })
        if (!parsed.success) {
            const nextErrors = fieldErrors(parsed.error)
            setErrors(nextErrors)
            setTab(nextErrors['name'] || nextErrors['slug'] ? 'info' : 'prices')
            return
        }

        // The offer is optional here; only vet it when the admin actually filled something.
        // Its errors surface as free text on the offer tab (not a per-field red), so jump there.
        if (offerDraftTouched(offerDraft)) {
            const offerError = validateOfferDraft(offerDraft)
            if (offerError) {
                setTab('offer')
                setError(t(offerError))
                return
            }
        }

        setErrors({})
        const prices = free ? [] : filledPrices(priceDraft)

        let created = false
        // Which follow-up we're on, so a failure after the plan is born lands the modal
        // (now in edit mode) on the tab whose step failed.
        let step: 'prices' | 'offer' = 'prices'
        try {
            const newId = await create.mutateAsync({
                audience,
                slug,
                name,
                description: description || null,
                entitlements,
                isFree: free,
                highlighted,
                translations: translationPayload(translations),
            })
            created = true
            setPlanId(newId)

            for (const price of prices) await addPrice.mutateAsync({ planId: newId, ...price })

            // The plan now exists, so the offer has a plan to hang on. Publish it last,
            // only if the admin filled it in.
            step = 'offer'
            if (offerDraftTouched(offerDraft)) await upsertOffer.mutateAsync(offerInputFrom(newId, offerDraft))

            onClose()
        } catch (err) {
            setError(toMessage(err))
            if (created) setTab(step)
        }
    }

    const creating = create.isPending || addPrice.isPending || upsertOffer.isPending

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
                        { value: 'translations', label: t('planTabTranslations') },
                        { value: 'offer', label: t('planTabOffer') },
                    ]}
                    value={tab}
                    onChange={(value) => setTab(value as PlanTab)}
                />

                {planId ? (
                    // Existing plan: each tab is its own independent form. All four stay
                    // MOUNTED inside <Activity> — the hidden ones keep their unsaved state
                    // (React preserves it and tears down their effects until shown again),
                    // so switching tabs and coming back never loses what was typed. They
                    // are separate <form>s, so a hidden `required` field can never block a
                    // submit fired from another tab.
                    <>
                        <Activity mode={tab === 'info' ? 'visible' : 'hidden'}>
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
                                    highlighted={highlighted}
                                    setHighlighted={setHighlighted}
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
                        </Activity>

                        <Activity mode={tab === 'prices' ? 'visible' : 'hidden'}>
                            {plan ? (
                                <PricesPanel plan={plan} onClose={onClose} />
                            ) : (
                                <Skeleton className="h-40 rounded-2xl" />
                            )}
                        </Activity>

                        <Activity mode={tab === 'offer' ? 'visible' : 'hidden'}>
                            {plan ? (
                                <OfferPanel plan={plan} onClose={onClose} />
                            ) : (
                                <Skeleton className="h-40 rounded-2xl" />
                            )}
                        </Activity>

                        <Activity mode={tab === 'translations' ? 'visible' : 'hidden'}>
                            <form onSubmit={onUpdateTranslations} className="space-y-4">
                                <TranslationsFields
                                    value={translations}
                                    onChange={(locale, patch) =>
                                        setTranslations((current) => {
                                            const prev = current[locale] ?? { name: '', description: '' }

                                            return {
                                                ...current,
                                                [locale]: {
                                                    name: patch.name ?? prev.name,
                                                    description: patch.description ?? prev.description,
                                                },
                                            }
                                        })
                                    }
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
                                            analyticsId="admin-plan-translations-save"
                                            loading={update.isPending}
                                        >
                                            {t('save')}
                                        </SubmitButton>
                                    </div>
                                </div>
                            </form>
                        </Activity>
                    </>
                ) : (
                    // New plan: base info and prices are filled together, then created
                    // and published in one submit. One form, the tabs swap which half shows.
                    // The inactive half is unmounted (not just hidden) so a `required` field
                    // it holds can't silently block a submit fired from the other tab.
                    // `noValidate`: we run validation in JS and mark bad fields red inline,
                    // rather than firing the browser's native single-field popup.
                    <form onSubmit={onCreate} noValidate className="space-y-4">
                        {tab === 'info' ? (
                            <PlanBaseFields
                                schema={schema}
                                name={name}
                                setName={setName}
                                nameError={errors['name'] ? t(errors['name']) : undefined}
                                slug={slug}
                                setSlug={setSlug}
                                slugError={errors['slug'] ? t(errors['slug']) : undefined}
                                showSlug
                                description={description}
                                setDescription={setDescription}
                                entitlements={entitlements}
                                setEntitlements={setEntitlements}
                                highlighted={highlighted}
                                setHighlighted={setHighlighted}
                                liveNote={false}
                            />
                        ) : tab === 'prices' ? (
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
                                {errors['prices'] ? <p className="text-xs text-ember">{t(errors['prices'])}</p> : null}
                            </div>
                        ) : tab === 'translations' ? (
                            <TranslationsFields
                                value={translations}
                                onChange={(locale, patch) =>
                                    setTranslations((current) => {
                                        const prev = current[locale] ?? { name: '', description: '' }

                                        return {
                                            ...current,
                                            [locale]: {
                                                name: patch.name ?? prev.name,
                                                description: patch.description ?? prev.description,
                                            },
                                        }
                                    })
                                }
                            />
                        ) : (
                            // An offer needs a saved plan, so it rides along and publishes
                            // right after create. Left untouched, no offer is created.
                            <div className="space-y-4">
                                <p className="text-xs text-text-faint">{t('offerHint')}</p>
                                <OfferFields
                                    value={offerDraft}
                                    onChange={(patch) => setOfferDraft((current) => ({ ...current, ...patch }))}
                                />
                                <p className="rounded-xl bg-white/[0.03] px-3 py-2 text-xs text-text-faint">
                                    {t('offerSyncHint')}
                                </p>
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
    nameError,
    slug,
    setSlug,
    slugError,
    showSlug,
    description,
    setDescription,
    entitlements,
    setEntitlements,
    highlighted,
    setHighlighted,
    liveNote,
}: {
    schema?: EntitlementsJsonSchema
    name: string
    setName: (value: string) => void
    nameError?: string
    slug: string
    setSlug: (value: string) => void
    slugError?: string
    showSlug: boolean
    description: string
    setDescription: (value: string) => void
    entitlements: EntitlementsValue
    setEntitlements: (value: EntitlementsValue) => void
    highlighted: boolean
    setHighlighted: (value: boolean) => void
    liveNote: boolean
}) {
    const t = useTranslations('admin')
    const highlightId = useId()

    return (
        <div className="space-y-4">
            <Field label={t('planName')} error={nameError}>
                <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    aria-invalid={!!nameError}
                    required
                    maxLength={60}
                />
            </Field>

            {showSlug ? (
                <Field label={t('planSlug')} error={slugError} hint={t('planSlugHint')}>
                    <Input
                        value={slug}
                        onChange={(event) => setSlug(event.target.value)}
                        aria-invalid={!!slugError}
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

            <div className="rounded-2xl bg-bg/40 p-4 ring-1 ring-hairline">
                <div className="flex items-center gap-3">
                    <input
                        id={highlightId}
                        type="checkbox"
                        checked={highlighted}
                        onChange={(event) => setHighlighted(event.target.checked)}
                        className="size-4 accent-ember"
                    />
                    <label htmlFor={highlightId} className="text-sm text-text-dim">
                        {t('planHighlighted')}
                    </label>
                </div>
                <p className="mt-1.5 pl-7 text-xs text-text-faint">{t('planHighlightedHint')}</p>
            </div>

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

/** The seeded translation drafts: what's saved for each non-default locale, else empty. */
function seedTranslations(initial?: AdminPlan): TranslationDraft {
    const seed: TranslationDraft = {}
    for (const locale of TRANSLATION_LOCALES) {
        const saved = initial?.translations.find((translation) => translation.locale === locale)
        seed[locale] = { name: saved?.name ?? '', description: saved?.description ?? '' }
    }

    return seed
}

/** The drafts as the API's translations input — a locale with no name is dropped so it
 *  falls back to the base. */
function translationPayload(draft: TranslationDraft): PlanTranslationInput[] {
    return TRANSLATION_LOCALES.flatMap((locale) => {
        const entry = draft[locale]
        if (!entry?.name.trim()) return []

        return [{ locale, name: entry.name.trim(), description: entry.description.trim() || null }]
    })
}

/** Name + description per non-default locale. Empty rows fall back to the base. */
function TranslationsFields({
    value,
    onChange,
}: {
    value: TranslationDraft
    onChange: (locale: string, patch: Partial<{ name: string; description: string }>) => void
}) {
    const t = useTranslations('admin')

    return (
        <div className="space-y-4">
            <p className="text-xs text-text-faint">{t('planTranslationsHint')}</p>
            {TRANSLATION_LOCALES.map((locale) => (
                <div key={locale} className="space-y-3 rounded-2xl bg-bg/40 p-4 ring-1 ring-hairline">
                    <p className="font-mono text-eyebrow uppercase text-text-faint">
                        {t(`localeName.${locale}` as 'localeName.es')}
                    </p>
                    <Field label={t('planName')}>
                        <Input
                            value={value[locale]?.name ?? ''}
                            onChange={(event) => onChange(locale, { name: event.target.value })}
                            maxLength={60}
                        />
                    </Field>
                    <Field label={t('planDescription')}>
                        <Textarea
                            value={value[locale]?.description ?? ''}
                            onChange={(event) => onChange(locale, { description: event.target.value })}
                            maxLength={500}
                        />
                    </Field>
                </div>
            ))}
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

/** An ISO timestamp as the `yyyy-mm-dd` a `<input type="date">` wants, or empty. */
function toDateInput(iso: string | null | undefined): string {
    return iso ? iso.slice(0, 10) : ''
}

/** The offer form's raw string state — one shape shared by the create draft and the edit panel. */
type OfferDraft = {
    name: string
    message: string
    trialDays: string
    percentOff: string
    cycles: string
    startsAt: string
    endsAt: string
}

/** Seed a draft from a saved offer (edit) or empty (create); the name defaults so it's never blank. */
function seedOfferDraft(offer: AdminPlan['offer'], defaultName: string): OfferDraft {
    return {
        name: offer?.name ?? defaultName,
        message: offer?.message ?? '',
        trialDays: offer?.trialDays ? String(offer.trialDays) : '',
        percentOff: offer?.introPhase ? String(offer.introPhase.percentOff) : '',
        cycles: offer?.introPhase ? String(offer.introPhase.cycles) : '',
        startsAt: toDateInput(offer?.startsAt),
        endsAt: toDateInput(offer?.endsAt),
    }
}

/** True if the admin filled anything beyond the pre-seeded name — i.e. an offer is intended. */
function offerDraftTouched(draft: OfferDraft): boolean {
    return [draft.message, draft.trialDays, draft.percentOff, draft.cycles, draft.startsAt, draft.endsAt].some(
        (value) => value.trim() !== '',
    )
}

/**
 * The offer's shape rules, as a message key or null. An offer must grant something (trial
 * and/or intro discount), and an intro phase needs both halves — the API refuses otherwise.
 */
function validateOfferDraft(draft: OfferDraft): 'offerNeedsSomething' | 'offerDiscountIncomplete' | null {
    const hasTrial = draft.trialDays.trim() !== ''
    const hasIntroField = draft.percentOff.trim() !== '' || draft.cycles.trim() !== ''

    if (!hasTrial && !hasIntroField) return 'offerNeedsSomething'
    if (hasIntroField && (draft.percentOff.trim() === '' || draft.cycles.trim() === ''))
        return 'offerDiscountIncomplete'

    return null
}

/** A validated draft as the upsert input (the cents/ISO shaping the API wants). */
function offerInputFrom(planId: string, draft: OfferDraft): UpsertPlanOfferInput {
    const hasTrial = draft.trialDays.trim() !== ''
    const hasIntro = draft.percentOff.trim() !== '' || draft.cycles.trim() !== ''

    return {
        planId,
        name: draft.name.trim(),
        message: draft.message.trim() || null,
        trialDays: hasTrial ? Number(draft.trialDays) : null,
        introPhase: hasIntro ? { cycles: Number(draft.cycles), percentOff: Number(draft.percentOff) } : null,
        startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
        endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
    }
}

/** The offer form fields — presentational; state lives in the parent (create draft or edit panel). */
function OfferFields({ value, onChange }: { value: OfferDraft; onChange: (patch: Partial<OfferDraft>) => void }) {
    const t = useTranslations('admin')

    return (
        <div className="space-y-4">
            <Field label={t('offerName')} hint={t('offerNameHint')}>
                <Input
                    value={value.name}
                    onChange={(event) => onChange({ name: event.target.value })}
                    required
                    maxLength={60}
                />
            </Field>

            <Field label={t('offerMessage')} hint={t('offerMessageHint')}>
                <Textarea
                    value={value.message}
                    onChange={(event) => onChange({ message: event.target.value })}
                    maxLength={120}
                    placeholder={t('offerMessagePlaceholder')}
                />
            </Field>

            <Field label={t('offerTrialDays')} hint={t('offerTrialDaysHint')}>
                <Input
                    type="number"
                    min="1"
                    max="365"
                    inputMode="numeric"
                    placeholder="—"
                    value={value.trialDays}
                    onChange={(event) => onChange({ trialDays: event.target.value })}
                />
            </Field>

            <div className="rounded-2xl bg-bg/40 p-4 ring-1 ring-hairline">
                <p className="font-mono text-eyebrow uppercase text-text-dim">{t('offerDiscountTitle')}</p>
                <p className="mt-1 text-xs text-text-faint">{t('offerDiscountHint')}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                    <Field label={t('offerDiscountPercent')}>
                        <Input
                            type="number"
                            min="1"
                            max="100"
                            inputMode="numeric"
                            placeholder="—"
                            value={value.percentOff}
                            onChange={(event) => onChange({ percentOff: event.target.value })}
                        />
                    </Field>
                    <Field label={t('offerDiscountCycles')}>
                        <Input
                            type="number"
                            min="1"
                            max="36"
                            inputMode="numeric"
                            placeholder="—"
                            value={value.cycles}
                            onChange={(event) => onChange({ cycles: event.target.value })}
                        />
                    </Field>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Field label={t('offerStartsAt')} hint={t('offerStartsAtHint')}>
                    <Input
                        type="date"
                        value={value.startsAt}
                        onChange={(event) => onChange({ startsAt: event.target.value })}
                    />
                </Field>
                <Field label={t('offerEndsAt')} hint={t('offerEndsAtHint')}>
                    <Input
                        type="date"
                        value={value.endsAt}
                        onChange={(event) => onChange({ endsAt: event.target.value })}
                    />
                </Field>
            </div>
        </div>
    )
}

/**
 * The plan's introductory offer: a free trial and/or a discounted opening phase,
 * plus the promo line buyers see. There is at most one live offer per plan; saving
 * **replaces** it (terms are immutable, so a change is a new offer), and after a
 * change the plan must be re-synced to the gateways for the coupon/plan to exist —
 * hence the reminder. A trial is honoured once per account; that limit is enforced
 * at checkout, nothing to configure here.
 */
function OfferPanel({ plan, onClose }: { plan: AdminPlan; onClose: () => void }) {
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
