'use client'

import { ClientError } from 'graphql-request'
import { useTranslations } from 'next-intl'

import { TrackedLink } from '@/components/ui/tracked'

/**
 * What the user sees when the API says no because of their plan.
 *
 * The **server is the authority** — this never decides anything, it just turns a
 * refusal into an offer. The two codes it recognises carry what they need:
 * `FEATURE_NOT_IN_PLAN` names the missing `feature`, so the copy talks about the
 * thing the user actually tried to do rather than a generic pricing page; and
 * `PLAN_LIMIT_REACHED` carries the `limit` they hit.
 *
 * Anything else renders nothing: not every error is an upgrade opportunity.
 */
type PlanRefusal = { kind: 'feature'; feature: string } | { kind: 'limit'; resource: string; limit: number } | null

function refusalOf(error: unknown): PlanRefusal {
    if (!(error instanceof ClientError)) return null

    const extensions = error.response.errors?.[0]?.extensions as
        | { code?: string; feature?: string; resource?: string; limit?: number }
        | undefined

    if (extensions?.code === 'FEATURE_NOT_IN_PLAN') {
        return { kind: 'feature', feature: extensions.feature ?? 'ai' }
    }
    if (extensions?.code === 'PLAN_LIMIT_REACHED') {
        return { kind: 'limit', resource: extensions.resource ?? 'athletes', limit: extensions.limit ?? 0 }
    }

    return null
}

/** True when this error is a plan refusal — so a caller can suppress its own error UI. */
export function isPlanRefusal(error: unknown): boolean {
    return refusalOf(error) !== null
}

export function UpgradeGate({ error }: { error: unknown }) {
    const t = useTranslations('billing.gate')
    const refusal = refusalOf(error)
    if (!refusal) return null

    const message =
        refusal.kind === 'limit'
            ? t.has(`limitReached.${refusal.resource}` as 'limitReached.athletes')
                ? t(`limitReached.${refusal.resource}` as 'limitReached.athletes', { limit: refusal.limit })
                : t('limitReached.generic')
            : t.has(`feature.${refusal.feature}` as 'feature.ai')
              ? t(`feature.${refusal.feature}` as 'feature.ai')
              : t('featureGeneric')

    return (
        <div className="rounded-2xl bg-ember/[0.07] p-4 ring-1 ring-ember/25">
            <p className="text-sm text-text">{message}</p>
            <TrackedLink
                analyticsId="upgrade-gate-cta"
                href="/profile/plan"
                className="mt-3 inline-flex rounded-full bg-ember-gradient px-4 py-2 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98]"
            >
                {t('cta')}
            </TrackedLink>
        </div>
    )
}
