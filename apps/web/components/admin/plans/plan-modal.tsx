'use client'

import { useTranslations } from 'next-intl'
import { type SubmitEvent, Activity, useEffect, useState } from 'react'

import {
    type AdminPlan,
    useAddPlanPrice,
    useCreatePlan,
    useEntitlementsSchema,
    useUpdatePlan,
    useUpsertPlanOffer,
} from '@/lib/graphql/hooks/use-admin-billing'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { fieldErrors } from '@/lib/validation/errors'
import { planCreateSchema } from '@/lib/validation/plan'
import { type EntitlementsValue, emptyEntitlements } from '@/components/admin/entitlements-form'
import { FormError } from '@/components/ui/form-error'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { SlidingTabs } from '@/components/ui/sliding-tabs'
import { SubmitButton } from '@/components/ui/submit-button'
import { TrackedButton } from '@/components/ui/tracked'
import { FreeToggle } from './free-toggle'
import { OfferFields } from './offer-fields'
import { OfferPanel } from './offer-panel'
import { PlanBaseFields } from './plan-base-fields'
import { PriceMatrix } from './price-matrix'
import { PricesPanel } from './prices-panel'
import {
    type OfferDraft,
    filledPrices,
    offerDraftTouched,
    offerInputFrom,
    seedOfferDraft,
    seedTranslations,
    type TranslationDraft,
    translationPayload,
    validateOfferDraft,
} from './shared'
import { TranslationsFields } from './translations-fields'

// An offer needs a saved plan (FK). In edit mode it's live via OfferPanel; in create it
// rides along as a draft and publishes right after the plan is born (like prices).
type PlanTab = 'info' | 'prices' | 'translations' | 'offer'

/**
 * Create or edit a plan — base info and prices in one place, split into two tabs.
 *
 * A price needs a plan to hang on (`addPlanPrice` takes a `planId`), so a brand-new
 * plan can't have prices until it exists. The create path handles that seam: the
 * prices tab only appears once the plan is saved, and creating it advances straight
 * there. The entitlements editor builds itself from the API's schema.
 */
export function PlanModal({
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
