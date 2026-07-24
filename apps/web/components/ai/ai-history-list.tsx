'use client'

import { useTranslations } from 'next-intl'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { useMyAthletes } from '@/lib/graphql/hooks/use-coaching'
import { type AiDraftKindFilter, useAiDraftHistory } from '@/lib/graphql/hooks/use-ai-history'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { fullName } from '@/lib/user-name'
import { QueryError } from '@/components/ui/query-error'
import { Skeleton } from '@/components/ui/skeleton'
import { TrackedButton } from '@/components/ui/tracked'
import { AiDraftCard } from './ai-draft-card'
import { AiHistoryEmpty, AiHistoryNoMatches } from './ai-history-empty'
import { AiHistoryFilters } from './ai-history-filters'

const KINDS: AiDraftKindFilter[] = ['all', 'session', 'mesocycle']

function readKind(raw: string | null): AiDraftKindFilter {
    return KINDS.find((kind) => kind === raw) ?? 'all'
}

/**
 * The history feed. Filters live in the URL so the panels can deep-link into a
 * scoped view and the back button works; this component is the only client leaf
 * on the page.
 */
export function AiHistoryList() {
    const t = useTranslations('aiHistory')
    const tf = useTranslations('aiHistory.filters')
    const router = useRouter()
    const pathname = usePathname()
    const params = useSearchParams()

    const kind = readKind(params.get('kind'))
    const sessionId = params.get('sessionId') ?? undefined
    const filtered = kind !== 'all' || sessionId !== undefined

    const history = useAiDraftHistory({ kind, sessionId })
    const errorMessage = useErrorMessage()

    const items = history.data?.pages.flatMap((page) => page.items) ?? []

    // Only a coach's feed carries athlete-attributed drafts, and only then is the
    // roster worth fetching — the query is role-gated, so asking as an athlete
    // would be a guaranteed refusal.
    const needsRoster = items.some((draft) => draft.athleteId !== null)
    const athletes = useMyAthletes(needsRoster)
    const nameOf = (athleteId: string | null): string | undefined => {
        if (!athleteId) return undefined
        const athlete = athletes.data?.find((row) => row.userId === athleteId)

        // An unresolvable id degrades to a generic — never a raw uuid.
        return athlete ? (fullName(athlete) ?? `@${athlete.username}`) : t('anAthlete')
    }

    function setKind(next: AiDraftKindFilter) {
        const query = new URLSearchParams(params.toString())
        if (next === 'all') query.delete('kind')
        else query.set('kind', next)

        const search = query.toString()
        router.replace(search ? `${pathname}?${search}` : pathname)
    }

    function clearFilters() {
        router.replace(pathname)
    }

    if (history.isError) {
        return (
            <QueryError
                message={errorMessage(history.error)}
                onRetry={() => history.refetch()}
                analyticsId="ai-history-retry"
            />
        )
    }

    // First load: no chips yet — they would render counts and a selection over
    // data we don't have.
    if (history.isPending) {
        return (
            <div className="flex flex-col gap-3">
                {[0, 1, 2, 3].map((row) => (
                    <Skeleton key={row} className="h-28 rounded-2xl" />
                ))}
            </div>
        )
    }

    if (items.length === 0 && !filtered) {
        return <AiHistoryEmpty />
    }

    return (
        <div>
            <AiHistoryFilters value={kind} onChange={setKind} />

            {items.length === 0 ? (
                <div className="mt-6">
                    <AiHistoryNoMatches kindLabel={tf(kind)} onClear={clearFilters} />
                </div>
            ) : (
                <div
                    className={`mt-6 flex flex-col gap-3 ${
                        // A filter change refreshes in place; the rows already on
                        // screen stay readable instead of flashing a skeleton.
                        history.isFetching && !history.isFetchingNextPage ? 'pointer-events-none opacity-50' : ''
                    }`}
                >
                    {items.map((draft) => (
                        <AiDraftCard key={draft.id} draft={draft} athleteName={nameOf(draft.athleteId)} />
                    ))}
                </div>
            )}

            {history.hasNextPage ? (
                <div className="mt-6">
                    <TrackedButton
                        analyticsId="ai-history-load-more"
                        type="button"
                        disabled={history.isFetchingNextPage}
                        onClick={() => history.fetchNextPage()}
                        className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text disabled:opacity-50"
                    >
                        {history.isFetchingNextPage ? t('loading') : t('loadMore')}
                    </TrackedButton>
                </div>
            ) : null}
        </div>
    )
}
