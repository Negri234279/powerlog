'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import type { AdminPlan } from '@/lib/graphql/hooks/use-admin-billing'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { useSyncPlanToGateway } from '@/lib/graphql/hooks/use-admin-gateways'
import { FormError } from '@/components/ui/form-error'
import { Spinner } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'

/** Publish the plan to a gateway. Shows whether it has ever been published there. */
export function SyncButtons({ plan }: { plan: AdminPlan }) {
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
