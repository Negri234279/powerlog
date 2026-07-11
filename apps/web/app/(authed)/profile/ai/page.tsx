'use client'

import { useTranslations } from 'next-intl'

import { AiProviderCard } from '@/components/profile/ai-provider-card'
import { AiUsageTable } from '@/components/profile/ai-usage-table'
import { Skeleton } from '@/components/ui/skeleton'
import { AI_PROVIDERS, useMyAiSettings } from '@/lib/graphql/hooks/use-ai-settings'

/**
 * BYOK tab: connect an OpenAI and/or Anthropic key so powerlog can analyse
 * training with them. The cost sits on the user's own provider plan, and the
 * keys are stored encrypted — the API never gives one back.
 */
export default function AiSettingsPage() {
    const t = useTranslations('ai')
    const { data: configs, isLoading, isError } = useMyAiSettings()

    return (
        <div>
            <p className="max-w-lg text-body text-text-dim">{t('intro')}</p>

            {isLoading ? (
                <div className="mt-6 space-y-6">
                    <Skeleton className="h-64 rounded-[2rem]" />
                    <Skeleton className="h-64 rounded-[2rem]" />
                </div>
            ) : isError ? (
                <p className="mt-6 text-body text-ember">{t('loadError')}</p>
            ) : (
                <div className="mt-6 space-y-6">
                    {AI_PROVIDERS.map((provider) => (
                        <AiProviderCard
                            key={provider}
                            provider={provider}
                            config={configs?.find((config) => config.provider === provider)}
                        />
                    ))}
                </div>
            )}

            <div className="mt-12">
                <AiUsageTable />
            </div>
        </div>
    )
}
