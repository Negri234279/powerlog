'use client'

import { useTranslations } from 'next-intl'

import { Bolt, Search } from '@/components/ui/icons'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'

/**
 * Nothing has ever been asked of the model. Explains what the screen will hold —
 * including that discarded drafts are kept, which is the non-obvious half — and
 * offers the two ways to produce one.
 */
export function AiHistoryEmpty() {
    const t = useTranslations('aiHistory.empty')

    return (
        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-8">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-hairline">
                    <Bolt className="size-5 text-ember" />
                </div>
                <h2 className="mt-5 font-display text-h3">{t('title')}</h2>
                <p className="mt-2 max-w-md text-body text-text-dim">{t('body')}</p>
                <div className="mt-6 flex flex-wrap items-center gap-3">
                    <TrackedLink
                        analyticsId="ai-history-empty-new-block"
                        href="/workouts/mesocycles"
                        className="inline-flex items-center gap-2 rounded-full bg-ember-gradient px-5 py-2.5 text-sm font-medium text-bg glow-ember transition-transform duration-300 ease-spring hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {t('designBlock')}
                    </TrackedLink>
                    <TrackedLink
                        analyticsId="ai-history-empty-workouts"
                        href="/workouts"
                        className="text-sm text-text-dim transition-colors duration-300 hover:text-text"
                    >
                        {t('fromSession')}
                    </TrackedLink>
                </div>
            </div>
        </div>
    )
}

/**
 * The filter matched nothing. Names the filter rather than saying "no results",
 * so the user can tell an empty slice from an empty account — and offers the one
 * action that resolves it.
 */
export function AiHistoryNoMatches({ kindLabel, onClear }: { kindLabel: string; onClear: () => void }) {
    const t = useTranslations('aiHistory.empty')

    return (
        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-8">
                <div className="flex size-12 items-center justify-center rounded-2xl bg-white/[0.04] ring-1 ring-hairline">
                    <Search className="size-5 text-text-dim" />
                </div>
                <h2 className="mt-5 font-display text-h3">{t('noMatchesTitle', { kind: kindLabel })}</h2>
                <p className="mt-2 max-w-md text-body text-text-dim">{t('noMatchesBody')}</p>
                <TrackedButton
                    analyticsId="ai-history-clear-filter"
                    type="button"
                    onClick={onClear}
                    className="mt-6 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
                >
                    {t('clearFilter')}
                </TrackedButton>
            </div>
        </div>
    )
}
