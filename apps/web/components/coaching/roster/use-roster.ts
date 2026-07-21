'use client'

import { useMemo } from 'react'

import type { CoachUser, RosterEntry } from '@/lib/graphql/hooks/use-coaching'
import { fullName } from '@/lib/user-name'

export type RosterFilter = 'all' | 'attention' | 'thisWeek'
export type RosterSort = 'attention' | 'name' | 'last' | 'adherence' | 'next'
export type SortDirection = 'asc' | 'desc'

/** Identity and training rollups, merged. Metrics are absent until they load. */
export interface RosterRow {
    user: CoachUser
    name: string | null
    metrics: RosterEntry | undefined
}

/** Upcoming sessions within this many days count as "this week". */
const THIS_WEEK_DAYS = 7

/** Attention ordering — most urgent first. `none` sorts last. */
const ATTENTION_RANK: Record<string, number> = { stale: 0, neverTrained: 1, lowAdherence: 2, none: 3 }

/** Strips accents so "ruben" finds "Rubén" — a search that fails on its own users is worse than none. */
function normalize(value: string): string {
    // NFD splits an accented letter into base + combining mark, which the
    // Diacritic property then strips — so "ruben" matches "Rubén".
    return value
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
}

/**
 * Nulls always sort last, in **both** directions — direction only reverses the
 * known values. `null` here means "not measured", and an unmeasured athlete is
 * never the answer to "who needs attention". If nulls flipped to the top on an
 * ascending sort, the most common sort a coach performs (worst adherence first)
 * would bury the real problems under athletes who simply self-coach.
 */
function compareNullable(a: number | null | undefined, b: number | null | undefined, direction: SortDirection): number {
    const left = a ?? null
    const right = b ?? null
    if (left === null && right === null) return 0
    if (left === null) return 1
    if (right === null) return -1

    return direction === 'asc' ? left - right : right - left
}

/** Milliseconds since epoch, or null. */
function time(iso: string | null | undefined): number | null {
    return iso === null || iso === undefined ? null : new Date(iso).getTime()
}

function daysUntil(iso: string | null | undefined): number | null {
    const at = time(iso)
    return at === null ? null : (at - Date.now()) / 86_400_000
}

/**
 * Sorting by "last session" treats **never** as the extreme, not as missing.
 * Everywhere else absence means "we can't say"; here it is the loudest possible
 * answer, so it must sort as infinitely stale rather than drop to the bottom.
 */
function lastSessionKey(row: RosterRow): number | null {
    if (!row.metrics) return null
    return row.metrics.daysSinceLastSession ?? Number.MAX_SAFE_INTEGER
}

function compare(a: RosterRow, b: RosterRow, sort: RosterSort, direction: SortDirection): number {
    switch (sort) {
        case 'name':
            return direction === 'asc'
                ? a.user.username.localeCompare(b.user.username)
                : b.user.username.localeCompare(a.user.username)
        case 'last':
            return compareNullable(lastSessionKey(a), lastSessionKey(b), direction)
        case 'adherence':
            return compareNullable(a.metrics?.adherenceRate, b.metrics?.adherenceRate, direction)
        case 'next':
            return compareNullable(time(a.metrics?.nextSessionAt), time(b.metrics?.nextSessionAt), direction)
        case 'attention': {
            const rank =
                (ATTENTION_RANK[a.metrics?.attention ?? 'none'] ?? 3) -
                (ATTENTION_RANK[b.metrics?.attention ?? 'none'] ?? 3)
            if (rank !== 0) return rank

            // Within a tier, the one who has been away longest is the one to call.
            return compareNullable(lastSessionKey(b), lastSessionKey(a), 'asc')
        }
    }
}

export interface RosterView {
    rows: RosterRow[]
    /** Counts over the whole roster, unaffected by search or filter. */
    counts: { all: number; attention: number; thisWeek: number }
}

/**
 * Merges identity with training rollups, then filters and sorts.
 *
 * Everything is client-side on purpose: the domain bound is a coach's client
 * list, so even a big roster is a few dozen rows. Paging or server-side sorting
 * would cost a round trip per click to order data already in memory.
 */
export function useRoster(
    athletes: readonly CoachUser[],
    metrics: readonly RosterEntry[] | undefined,
    options: { query: string; filter: RosterFilter; sort: RosterSort; direction: SortDirection },
): RosterView {
    const byAthlete = useMemo(() => new Map((metrics ?? []).map((entry) => [entry.athleteId, entry])), [metrics])

    const rows = useMemo<RosterRow[]>(
        () =>
            athletes.map((user) => ({
                user,
                name: fullName(user),
                metrics: byAthlete.get(user.userId),
            })),
        [athletes, byAthlete],
    )

    const counts = useMemo(
        () => ({
            all: rows.length,
            attention: rows.filter((row) => row.metrics && row.metrics.attention !== 'none').length,
            thisWeek: rows.filter((row) => {
                const days = daysUntil(row.metrics?.nextSessionAt)
                return days !== null && days <= THIS_WEEK_DAYS
            }).length,
        }),
        [rows],
    )

    const visible = useMemo(() => {
        const needle = normalize(options.query.trim())

        const filtered = rows.filter((row) => {
            if (options.filter === 'attention' && (!row.metrics || row.metrics.attention === 'none')) return false
            if (options.filter === 'thisWeek') {
                const days = daysUntil(row.metrics?.nextSessionAt)
                if (days === null || days > THIS_WEEK_DAYS) return false
            }
            if (needle === '') return true

            return normalize(`${row.user.username} ${row.name ?? ''}`).includes(needle)
        })

        // A stable final tie-break keeps the order from shuffling between refetches.
        return [...filtered].sort(
            (a, b) => compare(a, b, options.sort, options.direction) || a.user.username.localeCompare(b.user.username),
        )
    }, [rows, options.query, options.filter, options.sort, options.direction])

    return { rows: visible, counts }
}
