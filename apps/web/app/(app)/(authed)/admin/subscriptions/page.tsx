'use client'

import { useTranslations } from 'next-intl'
import { type FormEvent, useState } from 'react'

import {
    type AdminSubscription,
    useAdminPlans,
    useAdminSubscriptions,
    useAssignSubscription,
    useRevokeSubscription,
} from '@/lib/graphql/hooks/use-admin-billing'
import { useAdminUsers } from '@/lib/graphql/hooks/use-admin-users'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { AdminTabs } from '@/components/admin/admin-tabs'
import { ClearableSearch } from '@/components/ui/clearable-search'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Field, Input, Select } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { Plus } from '@/components/ui/icons'
import { Modal } from '@/components/ui/modal'
import { Skeleton } from '@/components/ui/skeleton'
import { SubmitButton } from '@/components/ui/submit-button'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { TrackedButton } from '@/components/ui/tracked'

const STATUSES = ['incomplete', 'trialing', 'active', 'past_due', 'canceled', 'expired'] as const
const GATEWAYS = ['stripe', 'paypal', 'manual'] as const

function formatAmount(amountCents: number, currency: string): string {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(amountCents / 100)
}

export default function AdminSubscriptionsPage() {
    const t = useTranslations('admin')
    const [status, setStatus] = useState('')
    const [gateway, setGateway] = useState('')
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebouncedValue(search, 300)
    const [assigning, setAssigning] = useState(false)

    const { data, isLoading } = useAdminSubscriptions({
        status: status || undefined,
        gateway: gateway || undefined,
        search: debouncedSearch || undefined,
    })

    return (
        <div>
            <TextsReveal>
                <p className="font-mono text-eyebrow uppercase text-text-faint">{t('eyebrow')}</p>
                <h1 className="mt-1 font-display text-h2 tracking-tight">{t('subscriptionsTitle')}</h1>
            </TextsReveal>

            <div className="mt-8">
                <AdminTabs />
            </div>

            <div className="flex flex-wrap items-end gap-3">
                <div className="min-w-56 flex-1">
                    <ClearableSearch
                        analyticsId="admin-subscriptions-search"
                        value={search}
                        onChange={setSearch}
                        placeholder={t('subscriptionsSearch')}
                    />
                </div>
                <Select
                    aria-label={t('subscriptionStatus')}
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                    className="w-40 py-2.5"
                >
                    <option value="">{t('filterAnyStatus')}</option>
                    {STATUSES.map((value) => (
                        <option key={value} value={value}>
                            {t(`subscriptionStatusValue.${value}` as 'subscriptionStatusValue.active')}
                        </option>
                    ))}
                </Select>
                <Select
                    aria-label={t('subscriptionGateway')}
                    value={gateway}
                    onChange={(event) => setGateway(event.target.value)}
                    className="w-40 py-2.5"
                >
                    <option value="">{t('filterAnyGateway')}</option>
                    {GATEWAYS.map((value) => (
                        <option key={value} value={value}>
                            {value}
                        </option>
                    ))}
                </Select>
                <TrackedButton
                    analyticsId="admin-subscription-assign-open"
                    type="button"
                    onClick={() => setAssigning(true)}
                    className="inline-flex items-center gap-2 rounded-full bg-ember-gradient px-4 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98]"
                >
                    <Plus className="size-4" />
                    {t('subscriptionAssign')}
                </TrackedButton>
            </div>

            <div className="mt-6 space-y-2">
                {isLoading ? (
                    Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20 rounded-2xl" />)
                ) : data?.rows.length ? (
                    data.rows.map((subscription) => (
                        <SubscriptionRow key={subscription.id} subscription={subscription} />
                    ))
                ) : (
                    <p className="text-sm text-text-faint">{t('subscriptionsEmpty')}</p>
                )}
            </div>

            {data ? (
                <p className="mt-4 font-mono text-xs text-text-faint">
                    {t('subscriptionsTotal', { total: data.total })}
                </p>
            ) : null}

            {assigning ? <AssignModal onClose={() => setAssigning(false)} /> : null}
        </div>
    )
}

function SubscriptionRow({ subscription }: { subscription: AdminSubscription }) {
    const t = useTranslations('admin')
    const toMessage = useErrorMessage()
    const revoke = useRevokeSubscription()
    const [confirming, setConfirming] = useState(false)
    const [error, setError] = useState<string | null>(null)

    return (
        <article className="rounded-2xl bg-surface p-4 ring-1 ring-hairline">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm text-text">{subscription.email ?? subscription.userId}</p>
                    <p className="mt-0.5 font-mono text-xs text-text-faint">
                        {subscription.planName}
                        <span className="mx-1.5">·</span>
                        {subscription.gateway}
                        <span className="mx-1.5">·</span>
                        {subscription.amountCents !== null && subscription.currency
                            ? formatAmount(subscription.amountCents, subscription.currency)
                            : t('subscriptionNoCharge')}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="text-right">
                        <span className="font-mono text-eyebrow uppercase text-text-dim">
                            {t(`subscriptionStatusValue.${subscription.status}` as 'subscriptionStatusValue.active')}
                        </span>
                        <p className="mt-0.5 font-mono text-xs text-text-faint">
                            {subscription.cancelAtPeriodEnd ? t('subscriptionEndsOn') : t('subscriptionRenewsOn')}{' '}
                            {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                        </p>
                    </div>

                    {/* Only a comp can be ended here: one a gateway is billing must be
                        ended at the gateway, or the card would keep being charged. */}
                    {subscription.gateway === 'manual' ? (
                        <TrackedButton
                            analyticsId="admin-subscription-revoke-open"
                            type="button"
                            onClick={() => setConfirming(true)}
                            className="rounded-full px-3 py-1.5 text-xs text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-ember hover:ring-ember/40"
                        >
                            {t('subscriptionRevoke')}
                        </TrackedButton>
                    ) : null}
                </div>
            </div>

            <FormError error={error} />

            <ConfirmModal
                open={confirming}
                onClose={() => setConfirming(false)}
                onConfirm={() =>
                    revoke.mutate(subscription.id, {
                        onSuccess: () => setConfirming(false),
                        onError: (err) => {
                            setError(toMessage(err))
                            setConfirming(false)
                        },
                    })
                }
                title={t('subscriptionRevokeTitle')}
                description={t('subscriptionRevokeBody')}
                confirmLabel={t('subscriptionRevoke')}
                cancelLabel={t('cancel')}
                destructive
                pending={revoke.isPending}
                analyticsId="admin-subscription-revoke"
            />
        </article>
    )
}

/** Grant a plan by hand: find the user by email, pick a plan, optionally an end date. */
function AssignModal({ onClose }: { onClose: () => void }) {
    const t = useTranslations('admin')
    const toMessage = useErrorMessage()
    const assign = useAssignSubscription()
    const { data: plans } = useAdminPlans()

    const [email, setEmail] = useState('')
    const debouncedEmail = useDebouncedValue(email, 300)
    const { data: users } = useAdminUsers({ search: debouncedEmail })
    const match = debouncedEmail ? users?.pages[0]?.rows[0] : undefined

    const [planId, setPlanId] = useState('')
    const [until, setUntil] = useState('')
    const [error, setError] = useState<string | null>(null)

    // Only a plan that takes signups can be granted; a draft is not a plan yet.
    const grantable = plans?.filter((plan) => plan.status === 'active' && !plan.isFree) ?? []

    const onSubmit = (event: FormEvent) => {
        event.preventDefault()
        setError(null)
        if (!match) return

        assign.mutate(
            { userId: match.id, planId, until: until ? new Date(until).toISOString() : null },
            { onSuccess: onClose, onError: (err) => setError(toMessage(err)) },
        )
    }

    return (
        <Modal open onClose={onClose} className="max-w-md">
            <form onSubmit={onSubmit} className="space-y-4">
                <div>
                    <h2 className="font-display text-h4 tracking-tight">{t('subscriptionAssignTitle')}</h2>
                    <p className="mt-1 text-xs text-text-faint">{t('subscriptionAssignHint')}</p>
                </div>

                <Field
                    label={t('subscriptionAssignUser')}
                    hint={match ? t('subscriptionAssignFound', { handle: match.username ?? match.email }) : undefined}
                    error={debouncedEmail && !match ? t('subscriptionAssignNotFound') : undefined}
                >
                    <Input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="athlete@example.com"
                        required
                    />
                </Field>

                <Field label={t('subscriptionAssignPlan')}>
                    <Select value={planId} onChange={(event) => setPlanId(event.target.value)} required>
                        <option value="" disabled>
                            {t('subscriptionAssignPlanPlaceholder')}
                        </option>
                        {grantable.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                                {plan.name} ({plan.slug})
                            </option>
                        ))}
                    </Select>
                </Field>

                <Field label={t('subscriptionAssignUntil')} hint={t('subscriptionAssignUntilHint')}>
                    <Input type="date" value={until} onChange={(event) => setUntil(event.target.value)} />
                </Field>

                <FormError error={error} />

                <div className="flex gap-2">
                    <TrackedButton
                        analyticsId="admin-subscription-assign-cancel"
                        type="button"
                        onClick={onClose}
                        className="w-full rounded-full px-6 py-3 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text"
                    >
                        {t('cancel')}
                    </TrackedButton>
                    <SubmitButton
                        analyticsId="admin-subscription-assign"
                        loading={assign.isPending}
                        disabled={!match || !planId}
                    >
                        {t('subscriptionAssign')}
                    </SubmitButton>
                </div>
            </form>
        </Modal>
    )
}
