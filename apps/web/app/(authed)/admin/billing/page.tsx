'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { env } from '@/lib/env'
import { useAdminBillingStats } from '@/lib/graphql/hooks/use-admin-billing'
import {
    type GatewayDrift,
    type WebhookEvent,
    useAdminGatewayStatus,
    useAdminWebhookEvents,
    useCheckDrift,
    useRetryWebhookEvent,
} from '@/lib/graphql/hooks/use-admin-gateways'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { AdminTabs } from '@/components/admin/admin-tabs'
import { FormError } from '@/components/ui/form-error'
import { ArrowUpRight, ChartLine, CreditCard } from '@/components/ui/icons'
import { PopNumber } from '@/components/ui/pop-number'
import { Skeleton } from '@/components/ui/skeleton'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'

/** How long a silence is suspicious. Providers send events constantly. */
const SILENCE_HOURS = 6

function hoursSince(at: string | null | undefined): number | null {
    if (!at) return null

    return (Date.now() - new Date(at).getTime()) / 3_600_000
}

/**
 * The billing command centre.
 *
 * Everything here is about **the channel the numbers depend on**, not the numbers
 * themselves: a webhook endpoint that stopped receiving, an event whose handler
 * blew up, and the drift between our books and the gateway's. Time series live in
 * Grafana; this page is what you look at when something is wrong.
 */
export default function AdminBillingPage() {
    const t = useTranslations('admin')
    const { data: stats } = useAdminBillingStats()
    const { data: gateways, isLoading } = useAdminGatewayStatus()

    return (
        <div>
            <TextsReveal>
                <p className="font-mono text-eyebrow uppercase text-text-faint">{t('eyebrow')}</p>
                <h1 className="mt-1 font-display text-h2 tracking-tight">{t('billingTitle')}</h1>
            </TextsReveal>

            <div className="mt-8">
                <AdminTabs />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                <Stat label={t('billingActive')} value={stats?.activeSubscriptions} />
                <Stat label={t('billingTrialing')} value={stats?.trialing} />
                <Stat label={t('billingPastDue')} value={stats?.pastDue} />
                <Stat label={t('billingCanceling')} value={stats?.canceling} />
                <div className="rounded-2xl bg-surface p-5 ring-1 ring-hairline">
                    <p className="font-mono text-eyebrow uppercase text-text-faint">{t('billingMrr')}</p>
                    <div className="mt-2 space-y-0.5">
                        {stats?.mrr.length ? (
                            [...new Map(stats.mrr.map((row) => [row.currency, 0])).keys()].map((currency) => (
                                <p key={currency} className="font-display text-h4 tabular-nums tracking-tight">
                                    {new Intl.NumberFormat('en', { style: 'currency', currency }).format(
                                        stats.mrr
                                            .filter((row) => row.currency === currency)
                                            .reduce((total, row) => total + row.amountCents, 0) / 100,
                                    )}
                                </p>
                            ))
                        ) : (
                            <p className="font-display text-h4 tabular-nums tracking-tight">—</p>
                        )}
                    </div>
                </div>
            </div>

            <section className="mt-10">
                <h2 className="flex items-center gap-2 font-mono text-eyebrow uppercase text-text-dim">
                    <CreditCard className="size-4 text-text-faint" />
                    {t('gatewayHealth')}
                </h2>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {isLoading
                        ? Array.from({ length: 2 }).map((_, index) => (
                              <Skeleton key={index} className="h-40 rounded-2xl" />
                          ))
                        : gateways?.map((gateway) => <GatewayCard key={gateway.gateway} gateway={gateway} />)}
                </div>
            </section>

            <DriftCheck />
            <WebhookJournal />
            <GrafanaLink />
        </div>
    )
}

function GatewayCard({
    gateway,
}: {
    gateway: {
        gateway: string
        configured: boolean
        syncedPlans: number
        totalPlans: number
        lastWebhookAt: string | null
        failedWebhooks: number
    }
}) {
    const t = useTranslations('admin')
    const silentFor = hoursSince(gateway.lastWebhookAt)
    // Silence is not calm, it is deaf: the providers send events constantly, so
    // nothing arriving means the endpoint is broken (bad URL, TLS, proxy).
    const silent = gateway.configured && (silentFor === null || silentFor > SILENCE_HOURS)

    return (
        <article className="rounded-2xl bg-surface p-5 ring-1 ring-hairline">
            <div className="flex items-center justify-between">
                <h3 className="font-display text-h4 capitalize tracking-tight">{gateway.gateway}</h3>
                <span
                    className={`rounded-full px-2 py-0.5 font-mono text-eyebrow uppercase ${
                        gateway.configured ? 'bg-ember/15 text-ember' : 'bg-white/[0.04] text-text-faint'
                    }`}
                >
                    {gateway.configured ? t('gatewayConfigured') : t('gatewayNotConfigured')}
                </span>
            </div>

            {gateway.configured ? (
                <dl className="mt-4 space-y-2 text-sm">
                    <Row label={t('gatewaySyncedPlans')} value={`${gateway.syncedPlans} / ${gateway.totalPlans}`} />
                    <Row
                        label={t('gatewayLastWebhook')}
                        value={
                            gateway.lastWebhookAt ? new Date(gateway.lastWebhookAt).toLocaleString() : t('gatewayNever')
                        }
                        tone={silent ? 'bad' : 'ok'}
                    />
                    <Row
                        label={t('gatewayFailedWebhooks')}
                        value={String(gateway.failedWebhooks)}
                        tone={gateway.failedWebhooks > 0 ? 'bad' : 'ok'}
                    />
                </dl>
            ) : (
                <p className="mt-4 text-sm text-text-faint">{t('gatewayNotConfiguredBody')}</p>
            )}

            {silent ? (
                <p className="mt-3 rounded-xl bg-ember/10 px-3 py-2 text-xs text-ember">{t('gatewaySilent')}</p>
            ) : null}
        </article>
    )
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' }) {
    return (
        <div className="flex items-center justify-between gap-3">
            <dt className="text-text-faint">{label}</dt>
            <dd className={`font-mono text-xs ${tone === 'bad' ? 'text-ember' : 'text-text-dim'}`}>{value}</dd>
        </div>
    )
}

/** The reconciliation. It calls the gateways, so it only runs when asked. */
function DriftCheck() {
    const t = useTranslations('admin')
    const toMessage = useErrorMessage()
    const check = useCheckDrift()
    const [error, setError] = useState<string | null>(null)

    return (
        <section className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="font-mono text-eyebrow uppercase text-text-dim">{t('driftTitle')}</h2>
                    <p className="mt-1 text-xs text-text-faint">{t('driftHint')}</p>
                </div>
                <TrackedButton
                    analyticsId="admin-billing-drift-check"
                    type="button"
                    disabled={check.isPending}
                    onClick={() => {
                        setError(null)
                        check.mutate(undefined, { onError: (err) => setError(toMessage(err)) })
                    }}
                    className="rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text disabled:opacity-50"
                >
                    {check.isPending ? t('driftChecking') : t('driftCheck')}
                </TrackedButton>
            </div>

            <FormError error={error} />

            {check.data ? (
                <div className="mt-4 space-y-2">
                    {check.data.map((drift) => (
                        <DriftRow key={drift.gateway} drift={drift} />
                    ))}
                </div>
            ) : null}
        </section>
    )
}

function DriftRow({ drift }: { drift: GatewayDrift }) {
    const t = useTranslations('admin')

    // null is "we could not ask", which is NOT the same as "no drift" — saying zero
    // here would be a lie that silences the alert.
    if (drift.total === null) {
        return (
            <p className="rounded-2xl bg-surface p-4 text-sm text-text-faint ring-1 ring-hairline">
                {t('driftNoSignal', { gateway: drift.gateway })}
            </p>
        )
    }

    const clean = drift.total === 0

    return (
        <article
            className={`rounded-2xl p-4 ring-1 ${clean ? 'bg-surface ring-hairline' : 'bg-ember/[0.07] ring-ember/25'}`}
        >
            <p className={`text-sm ${clean ? 'text-text-dim' : 'text-text'}`}>
                {clean
                    ? t('driftClean', { gateway: drift.gateway })
                    : t('driftFound', { gateway: drift.gateway, count: drift.total })}
            </p>

            {!clean ? (
                <dl className="mt-2 space-y-1 font-mono text-xs text-text-faint">
                    {drift.missingLocally.length ? (
                        <div>
                            <dt className="text-ember">{t('driftMissing')}</dt>
                            <dd className="break-all">{drift.missingLocally.join(', ')}</dd>
                        </div>
                    ) : null}
                    {drift.staleLocally.length ? (
                        <div>
                            <dt className="text-ember">{t('driftStale')}</dt>
                            <dd className="break-all">{drift.staleLocally.join(', ')}</dd>
                        </div>
                    ) : null}
                </dl>
            ) : null}
        </article>
    )
}

/** Failed events first — those are the ones with something to do about them. */
function WebhookJournal() {
    const t = useTranslations('admin')
    const [onlyFailed, setOnlyFailed] = useState(true)
    const { data, isLoading } = useAdminWebhookEvents(onlyFailed ? 'failed' : undefined)

    return (
        <section className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-mono text-eyebrow uppercase text-text-dim">{t('webhooksTitle')}</h2>
                <label className="flex items-center gap-2 text-sm text-text-dim">
                    <input
                        type="checkbox"
                        checked={onlyFailed}
                        onChange={(event) => setOnlyFailed(event.target.checked)}
                        className="size-4 accent-ember"
                    />
                    {t('webhooksOnlyFailed')}
                </label>
            </div>

            <div className="mt-4 space-y-2">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-16 rounded-2xl" />)
                ) : data?.rows.length ? (
                    data.rows.map((event) => <WebhookRow key={event.id} event={event} />)
                ) : (
                    <p className="text-sm text-text-faint">
                        {onlyFailed ? t('webhooksNoneFailed') : t('webhooksNone')}
                    </p>
                )}
            </div>
        </section>
    )
}

function WebhookRow({ event }: { event: WebhookEvent }) {
    const t = useTranslations('admin')
    const toMessage = useErrorMessage()
    const retry = useRetryWebhookEvent()
    const [error, setError] = useState<string | null>(null)

    return (
        <article className="rounded-2xl bg-surface p-4 ring-1 ring-hairline">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-sm text-text">
                        <span className="capitalize text-text-dim">{event.gateway}</span>
                        <span className="mx-2 text-hairline">·</span>
                        {event.type}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-text-faint">
                        {new Date(event.receivedAt).toLocaleString()}
                        <span className="mx-1.5">·</span>
                        {event.eventId}
                    </p>
                    {event.error ? <p className="mt-1 text-xs text-ember">{event.error}</p> : null}
                </div>

                <div className="flex items-center gap-3">
                    <span
                        className={`font-mono text-eyebrow uppercase ${
                            event.status === 'failed' ? 'text-ember' : 'text-text-faint'
                        }`}
                    >
                        {event.status}
                    </span>
                    {/* Only a failed one is worth replaying: the pipeline is idempotent,
                        but re-running a processed event is noise, not a fix. */}
                    {event.status === 'failed' ? (
                        <TrackedButton
                            analyticsId="admin-webhook-retry"
                            type="button"
                            disabled={retry.isPending}
                            onClick={() => {
                                setError(null)
                                retry.mutate(event.id, { onError: (err) => setError(toMessage(err)) })
                            }}
                            className="rounded-full px-3 py-1.5 text-xs text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text disabled:opacity-50"
                        >
                            {t('webhookRetry')}
                        </TrackedButton>
                    ) : null}
                </div>
            </div>

            <FormError error={error} />
        </article>
    )
}

/** Anything that is a time series lives in Grafana; this page does not duplicate it. */
function GrafanaLink() {
    const t = useTranslations('admin')
    if (!env.grafanaUrl) return null

    return (
        <section className="mt-10">
            <TrackedLink
                analyticsId="admin-billing-grafana"
                href={`${env.grafanaUrl}/d/powerlog-billing`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-surface px-5 py-4 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text"
            >
                <ChartLine className="size-4 text-ember" />
                {t('billingGrafana')}
                <ArrowUpRight className="size-4" />
            </TrackedLink>
        </section>
    )
}

function Stat({ label, value }: { label: string; value?: number }) {
    return (
        <div className="rounded-2xl bg-surface p-5 ring-1 ring-hairline">
            <p className="font-mono text-eyebrow uppercase text-text-faint">{label}</p>
            <p className="mt-2 font-display text-h3 tabular-nums tracking-tight">
                <PopNumber value={value ?? '—'} />
            </p>
        </div>
    )
}
