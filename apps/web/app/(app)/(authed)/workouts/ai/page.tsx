import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { AiHistoryList } from '@/components/ai/ai-history-list'
import { Skeleton } from '@/components/ui/skeleton'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { WorkoutsTabs } from '@/components/workouts/workouts-tabs'

/**
 * The AI conversation history. A server shell — heading, tabs, static copy —
 * around a single client leaf; the filters live in the URL, so only the list
 * itself needs to be interactive.
 *
 * The `Suspense` boundary is required, not decorative: the list reads
 * `useSearchParams`, and Next refuses to prerender that without one.
 */
export default async function AiHistoryPage() {
    const t = await getTranslations('aiHistory')
    const tw = await getTranslations('workouts')

    return (
        <div className="max-w-4xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <TextsReveal>
                    <p className="font-mono text-eyebrow uppercase text-text-faint">{tw('training')}</p>
                    <h1 className="mt-1 font-display text-display">{t('title')}</h1>
                </TextsReveal>
            </div>

            <div className="mt-8">
                <WorkoutsTabs />
            </div>

            <p className="mb-6 max-w-lg text-body text-text-dim">{t('intro')}</p>

            <Suspense
                fallback={
                    <div className="flex flex-col gap-3">
                        {[0, 1, 2, 3].map((row) => (
                            <Skeleton key={row} className="h-28 rounded-2xl" />
                        ))}
                    </div>
                }
            >
                <AiHistoryList />
            </Suspense>
        </div>
    )
}
