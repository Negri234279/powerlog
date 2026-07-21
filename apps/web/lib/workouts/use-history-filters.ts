'use client'

import { useLocale, useTranslations } from 'next-intl'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { computeRange, formatDay, formatRange, PERIOD_MODES, type PeriodMode } from '@/lib/workouts/period'

export type StatusFilter = 'all' | 'planned' | 'completed'

export const STATUS_FILTERS: readonly StatusFilter[] = ['all', 'planned', 'completed']

/** Query-string keys the filters round-trip through. Short: they're user-visible. */
const PARAM = {
    status: 'status',
    exercise: 'ex',
    query: 'q',
    period: 'period',
    offset: 'off',
    from: 'from',
    to: 'to',
} as const

function isStatus(value: string | null): value is StatusFilter {
    return value !== null && (STATUS_FILTERS as readonly string[]).includes(value)
}

function isPeriod(value: string | null): value is PeriodMode {
    return value !== null && (PERIOD_MODES as readonly string[]).includes(value)
}

/** The filter arguments the history queries accept (athlete's own and coach's view). */
export interface HistoryFilters {
    status?: string
    from?: string
    to?: string
    exerciseId?: string
    query?: string
}

/**
 * Every filter the session history understands, in one place: status, exercise,
 * free text, and the time window.
 *
 * Time is deliberately separate from the rest. The period navigator owns the
 * date range on its own — presets compute their range, `custom` reveals manual
 * bounds, `all` is unbounded — so there is never a second date control to
 * reconcile, and "Clear" doesn't silently reset the window the user navigated to.
 *
 * Shared by the athlete's own `/workouts` and the coach's view of an athlete, so
 * the two can't drift into different filtering behaviour.
 *
 * The whole selection round-trips through the query string. Opening a session is
 * a navigation, so without it every trip into a workout and back dropped the
 * filters and dumped the user at the default window — the thing they had just
 * narrowed down. Params are written with `replace`, so filtering doesn't stack
 * history entries, but the entry left behind carries them and Back restores the
 * exact view. Sharing or reloading a filtered history works as a side effect.
 */
export function useHistoryFilters(initialPeriod: PeriodMode = 'week') {
    const t = useTranslations('workouts')
    const locale = useLocale()
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // Read once, on mount: from here on this hook owns the state and pushes it to
    // the URL. Re-reading would fight our own `replace`.
    const [status, setStatus] = useState<StatusFilter>(() => {
        const value = searchParams.get(PARAM.status)
        return isStatus(value) ? value : 'all'
    })
    const [exerciseId, setExerciseId] = useState(() => searchParams.get(PARAM.exercise) ?? '')
    const [queryInput, setQueryInput] = useState(() => searchParams.get(PARAM.query) ?? '')
    const debouncedQuery = useDebouncedValue(queryInput.trim(), 300)

    const [periodMode, setPeriodMode] = useState<PeriodMode>(() => {
        const value = searchParams.get(PARAM.period)
        return isPeriod(value) ? value : initialPeriod
    })
    const [periodOffset, setPeriodOffset] = useState(() => {
        const value = Number(searchParams.get(PARAM.offset))
        return Number.isInteger(value) ? value : 0
    })
    const [from, setFrom] = useState(() => searchParams.get(PARAM.from) ?? '')
    const [to, setTo] = useState(() => searchParams.get(PARAM.to) ?? '')

    const periodRange = useMemo(() => computeRange(periodMode, periodOffset), [periodMode, periodOffset])

    // Effective ISO-date bounds (local calendar) before whole-day UTC framing.
    const rangeFrom = periodMode === 'custom' ? from : (periodRange?.from ?? '')
    const rangeTo = periodMode === 'custom' ? to : (periodRange?.to ?? '')

    // A bounded window with no rows reads as "empty range", not "no history".
    const hasDateWindow = periodMode === 'custom' ? from !== '' || to !== '' : periodMode !== 'all'

    // Filters are orthogonal to time (status/exercise/text) — the date window is
    // owned by the navigator, so it's not counted here or reset by "Clear".
    const hasActiveFilters = status !== 'all' || exerciseId !== '' || queryInput.trim() !== ''

    const filters = useMemo<HistoryFilters>(() => {
        const next: HistoryFilters = {}

        if (status !== 'all') next.status = status
        if (exerciseId) next.exerciseId = exerciseId
        // Whole-day UTC bounds, consistent with how sessions are stored (noon UTC).
        if (rangeFrom) next.from = `${rangeFrom}T00:00:00.000Z`
        if (rangeTo) next.to = `${rangeTo}T23:59:59.999Z`
        if (debouncedQuery) next.query = debouncedQuery

        return next
    }, [status, exerciseId, rangeFrom, rangeTo, debouncedQuery])

    // Only what differs from the defaults, so an untouched history stays on a
    // clean URL and a shared link carries exactly the selection that was made.
    const queryString = useMemo(() => {
        const params = new URLSearchParams()

        if (status !== 'all') params.set(PARAM.status, status)
        if (exerciseId) params.set(PARAM.exercise, exerciseId)
        if (debouncedQuery) params.set(PARAM.query, debouncedQuery)
        if (periodMode !== initialPeriod) params.set(PARAM.period, periodMode)
        if (periodOffset !== 0) params.set(PARAM.offset, String(periodOffset))

        if (periodMode === 'custom') {
            if (from) params.set(PARAM.from, from)
            if (to) params.set(PARAM.to, to)
        }

        return params.toString()
    }, [status, exerciseId, debouncedQuery, periodMode, periodOffset, from, to, initialPeriod])

    // The text query is synced debounced, not per keystroke — the URL shouldn't
    // change (and history shouldn't churn) on every letter typed.
    useEffect(() => {
        if (window.location.search.replace(/^\?/, '') === queryString) return

        router.replace(queryString === '' ? pathname : `${pathname}?${queryString}`, { scroll: false })
    }, [queryString, pathname, router])

    function windowLabel(): string {
        if (periodMode === 'all') return t('period.allLabel')

        if (periodMode === 'custom') {
            if (!from && !to) return t('period.custom')
            return `${from ? formatDay(from, locale) : '…'} – ${to ? formatDay(to, locale) : '…'}`
        }

        return periodRange ? formatRange(periodMode, periodRange, locale) : ''
    }

    return {
        filters,
        hasActiveFilters,
        hasDateWindow,
        /** The selection as a query string — hand it to `backParam` on session links. */
        queryString,

        status,
        setStatus,
        exerciseId,
        setExerciseId,
        queryInput,
        setQueryInput,

        periodMode,
        periodOffset,
        from,
        to,
        setFrom,
        setTo,
        windowLabel,
        /** Switching size restarts at the current period — offsets don't carry over. */
        setPeriod: (mode: PeriodMode) => {
            setPeriodMode(mode)
            setPeriodOffset(0)
        },
        prevPeriod: () => setPeriodOffset((offset) => offset - 1),
        nextPeriod: () => setPeriodOffset((offset) => offset + 1),
        currentPeriod: () => setPeriodOffset(0),

        clear: () => {
            setStatus('all')
            setExerciseId('')
            setQueryInput('')
        },
    }
}
