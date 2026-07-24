'use client'

import { useTranslations } from 'next-intl'

import { TrackedButton } from '@/components/ui/tracked'

/** A failed read: an explanatory line plus a retry button wired to the query's refetch. */
export function QueryError({
    message,
    onRetry,
    analyticsId,
}: {
    message: string
    onRetry: () => void
    analyticsId: string
}) {
    const t = useTranslations('coaching')

    return (
        <div className="flex flex-col items-start gap-3 rounded-2xl bg-ember/5 px-5 py-4 ring-1 ring-ember/20">
            <p className="text-sm text-ember">{message}</p>
            <TrackedButton
                analyticsId={analyticsId}
                type="button"
                onClick={onRetry}
                className="rounded-full px-4 py-1.5 text-xs text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text"
            >
                {t('retry')}
            </TrackedButton>
        </div>
    )
}
