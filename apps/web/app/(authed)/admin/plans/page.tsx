'use client'

import { useTranslations } from 'next-intl'
import { type FormEvent, useEffect, useMemo, useState } from 'react'

import {
    type AdminPlan,
    type AdminPlanPrice,
    useAddPlanPrice,
    useAdminPlans,
    useCreatePlan,
    useDeactivatePlanPrice,
    useEntitlementsSchema,
    useSetPlanStatus,
    useUpdatePlan,
} from '@/lib/graphql/hooks/use-admin-billing'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { AdminTabs } from '@/components/admin/admin-tabs'
import { type EntitlementsValue, EntitlementsForm, emptyEntitlements } from '@/components/admin/entitlements-form'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Field, Input, Select, Textarea } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { Plus, Trash } from '@/components/ui/icons'
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
    const [editing, setEditing] = useState<AdminPlan | null>(null)
    const [creating, setCreating] = useState(false)
    const [pricing, setPricing] = useState<AdminPlan | null>(null)

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
                    plans.map((plan) => (
                        <PlanCard
                            key={plan.id}
                            plan={plan}
                            onEdit={() => setEditing(plan)}
                            onPrices={() => setPricing(plan)}
                        />
                    ))
                ) : (
                    <p className="text-sm text-text-faint">{t('plansEmpty')}</p>
                )}
            </div>

            {creating ? <PlanModal audience={audience} onClose={() => setCreating(false)} /> : null}
            {editing ? <PlanModal audience={audience} plan={editing} onClose={() => setEditing(null)} /> : null}
            {pricing ? <PricesModal plan={pricing} onClose={() => setPricing(null)} /> : null}
        </div>
    )
}

function PlanCard({ plan, onEdit, onPrices }: { plan: AdminPlan; onEdit: () => void; onPrices: () => void }) {
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
                <Grant label={t('entitlements.templates')} on={plan.snapshot.templates} />
                <Grant label={t('entitlements.mesocycles')} on={plan.snapshot.mesocycles} />
                <Grant label={t('entitlements.ai')} on={plan.snapshot.ai} />
                {plan.audience === 'coach' ? (
                    <>
                        <Grant label={t('entitlements.planSessions')} on={plan.snapshot.planSessions} />
                        <span className="rounded-full bg-white/[0.04] px-3 py-1 font-mono text-eyebrow uppercase text-text-dim">
                            {t('entitlements.maxAthletes')}:{' '}
                            {plan.snapshot.maxAthletes === null ? '∞' : plan.snapshot.maxAthletes}
                        </span>
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
                <TrackedButton
                    analyticsId="admin-plan-prices-open"
                    type="button"
                    onClick={onPrices}
                    className="ml-auto rounded-full px-3 py-1.5 text-xs text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text"
                >
                    {t('planPrices')}
                </TrackedButton>
            </div>
        </article>
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

function PricePill({ price }: { price: AdminPlanPrice }) {
    const t = useTranslations('admin')

    return (
        <span className="rounded-full bg-white/[0.04] px-3 py-1 font-mono text-xs text-text-dim">
            {formatAmount(price.amountCents, price.currency, 'en')} /{' '}
            {t(`interval.${price.interval}` as 'interval.month')}
        </span>
    )
}

/** Create or edit a plan. The entitlements editor builds itself from the API's schema. */
function PlanModal({ audience, plan, onClose }: { audience: string; plan?: AdminPlan; onClose: () => void }) {
    const t = useTranslations('admin')
    const toMessage = useErrorMessage()
    const { data: schema } = useEntitlementsSchema(plan?.audience ?? audience)
    const create = useCreatePlan()
    const update = useUpdatePlan()

    const [name, setName] = useState(plan?.name ?? '')
    const [slug, setSlug] = useState(plan?.slug ?? '')
    const [description, setDescription] = useState(plan?.description ?? '')
    const [entitlements, setEntitlements] = useState<EntitlementsValue>(
        (plan?.entitlements as EntitlementsValue | undefined) ?? {},
    )
    const [error, setError] = useState<string | null>(null)

    // A fresh plan starts from the schema's own empty shape; an existing one from
    // whatever it already grants.
    useEffect(() => {
        if (!schema || plan) return
        setEntitlements(emptyEntitlements(schema))
    }, [schema, plan])

    const pending = create.isPending || update.isPending

    const onSubmit = (event: FormEvent) => {
        event.preventDefault()
        setError(null)
        const onError = (err: unknown) => setError(toMessage(err))

        if (plan) {
            update.mutate(
                { id: plan.id, name, description: description || null, entitlements },
                { onSuccess: onClose, onError },
            )
            return
        }

        create.mutate(
            { audience, slug, name, description: description || null, entitlements },
            { onSuccess: onClose, onError },
        )
    }

    return (
        <Modal open onClose={onClose} className="max-w-lg">
            <form onSubmit={onSubmit} className="space-y-4">
                <h2 className="font-display text-h4 tracking-tight">
                    {plan ? t('planEditTitle') : t('planCreateTitle')}
                </h2>

                <Field label={t('planName')}>
                    <Input value={name} onChange={(event) => setName(event.target.value)} required maxLength={60} />
                </Field>

                {plan ? null : (
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
                )}

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
                    {plan?.status === 'active' ? (
                        <p className="text-xs text-text-faint">{t('planEntitlementsLive')}</p>
                    ) : null}
                </div>

                <FormError error={error} />

                <div className="flex gap-2">
                    <TrackedButton
                        analyticsId="admin-plan-cancel"
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-full px-6 py-3 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text"
                    >
                        {t('cancel')}
                    </TrackedButton>
                    <SubmitButton analyticsId="admin-plan-save" loading={pending} disabled={!schema}>
                        {t('save')}
                    </SubmitButton>
                </div>
            </form>
        </Modal>
    )
}

/** The plan's price versions: publish a new one, withdraw one, read the history. */
function PricesModal({ plan, onClose }: { plan: AdminPlan; onClose: () => void }) {
    const t = useTranslations('admin')
    const toMessage = useErrorMessage()
    const addPrice = useAddPlanPrice()
    const deactivate = useDeactivatePlanPrice()

    const [interval, setInterval] = useState<string>('month')
    const [currency, setCurrency] = useState<string>('EUR')
    const [amount, setAmount] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [withdrawing, setWithdrawing] = useState<AdminPlanPrice | null>(null)

    const [active, withdrawn] = useMemo(
        () => [plan.prices.filter((price) => price.active), plan.prices.filter((price) => !price.active)],
        [plan.prices],
    )

    // The plan in the cache is refreshed by the mutation; the modal reads it live.
    const replaces = active.find((price) => price.interval === interval && price.currency === currency)

    const onSubmit = (event: FormEvent) => {
        event.preventDefault()
        setError(null)
        const amountCents = Math.round(Number(amount) * 100)

        addPrice.mutate(
            { planId: plan.id, interval, currency, amountCents },
            { onSuccess: () => setAmount(''), onError: (err) => setError(toMessage(err)) },
        )
    }

    return (
        <Modal open onClose={onClose} className="max-w-lg">
            <div className="space-y-5">
                <div>
                    <h2 className="font-display text-h4 tracking-tight">{t('planPricesTitle', { name: plan.name })}</h2>
                    <p className="mt-1 text-xs text-text-faint">{t('planPricesHint')}</p>
                </div>

                <ul className="space-y-2">
                    {active.map((price) => (
                        <li
                            key={price.id}
                            className="flex items-center justify-between rounded-2xl bg-bg/40 px-4 py-3 ring-1 ring-hairline"
                        >
                            <span className="font-mono text-sm text-text">
                                {formatAmount(price.amountCents, price.currency, 'en')}
                                <span className="text-text-faint">
                                    {' '}
                                    / {t(`interval.${price.interval}` as 'interval.month')}
                                </span>
                            </span>
                            <TrackedButton
                                analyticsId="admin-price-withdraw-open"
                                type="button"
                                onClick={() => setWithdrawing(price)}
                                aria-label={t('planPriceWithdraw')}
                                className="grid size-8 place-items-center rounded-full text-text-dim transition-colors duration-300 hover:bg-ember/10 hover:text-ember"
                            >
                                <Trash className="size-4" />
                            </TrackedButton>
                        </li>
                    ))}
                    {active.length === 0 ? <li className="text-sm text-text-faint">{t('planNoPrice')}</li> : null}
                </ul>

                <form onSubmit={onSubmit} className="space-y-3 border-t border-hairline pt-5">
                    <div className="grid grid-cols-3 gap-2">
                        <Field label={t('planPriceInterval')}>
                            <Select value={interval} onChange={(event) => setInterval(event.target.value)}>
                                {INTERVALS.map((value) => (
                                    <option key={value} value={value}>
                                        {t(`interval.${value}` as 'interval.month')}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label={t('planPriceCurrency')}>
                            <Select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                                {CURRENCIES.map((value) => (
                                    <option key={value} value={value}>
                                        {value}
                                    </option>
                                ))}
                            </Select>
                        </Field>
                        <Field label={t('planPriceAmount')}>
                            <Input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={amount}
                                onChange={(event) => setAmount(event.target.value)}
                                required
                            />
                        </Field>
                    </div>

                    {replaces ? (
                        <p className="text-xs text-text-faint">
                            {t('planPriceReplaces', {
                                amount: formatAmount(replaces.amountCents, replaces.currency, 'en'),
                            })}
                        </p>
                    ) : null}

                    <FormError error={error} />

                    <SubmitButton analyticsId="admin-price-add" loading={addPrice.isPending}>
                        {t('planPriceAdd')}
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
            </div>

            <ConfirmModal
                open={Boolean(withdrawing)}
                onClose={() => setWithdrawing(null)}
                onConfirm={() => {
                    if (!withdrawing) return
                    deactivate.mutate(withdrawing.id, {
                        onSuccess: () => setWithdrawing(null),
                        onError: (err) => setError(toMessage(err)),
                    })
                }}
                title={t('planPriceWithdrawTitle')}
                description={t('planPriceWithdrawBody')}
                confirmLabel={t('planPriceWithdraw')}
                cancelLabel={t('cancel')}
                destructive
                pending={deactivate.isPending}
                analyticsId="admin-price-withdraw"
            />
        </Modal>
    )
}
