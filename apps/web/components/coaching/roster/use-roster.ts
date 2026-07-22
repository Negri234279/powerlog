'use client'

import { useMemo } from 'react'

import type { CoachUser, RosterEntry } from '@/lib/graphql/hooks/use-coaching'
import { fullName } from '@/lib/user-name'

/**
 * The reasons an athlete can be flagged. `none` is deliberately absent: it is
 * the absence of a reason, and offering "Attention: no problems" as a filter
 * option is a contradiction on the pill. If coaches ever want "show me who's
 * fine", that is a different facet, not a fourth entry here.
 */
export const ATTENTION_REASONS = ['stale', 'neverTrained', 'lowAdherence'] as const
export type AttentionReason = (typeof ATTENTION_REASONS)[number]

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

            // `rank` is already most-urgent-first, which is the descending sense.
            // Ascending flips it — a healthy-first read of the same list, and the
            // reason this header toggles like every other one instead of being an
            // arrow that promises a change it never makes.
            if (rank !== 0) return direction === 'asc' ? -rank : rank

            // Within a tier, longest away first when descending.
            return compareNullable(lastSessionKey(a), lastSessionKey(b), direction)
        }
    }
}

export interface RosterFilters {
    query: string
    /** Attention reasons to keep. Empty means "don't filter by attention". */
    attention: readonly AttentionReason[]
    /** Only athletes with a session inside the next week. */
    week: boolean
}

export interface RosterCounts {
    total: number
    visible: number
    /** Per reason, plus the union of all three. */
    attention: Record<AttentionReason, number> & { any: number }
    week: number
}

export interface RosterView {
    rows: RosterRow[]
    counts: RosterCounts
}

function matchesQuery(row: RosterRow, needle: string): boolean {
    if (needle === '') return true

    return normalize(`${row.user.username} ${row.name ?? ''}`).includes(needle)
}

function matchesWeek(row: RosterRow): boolean {
    const days = daysUntil(row.metrics?.nextSessionAt)

    return days !== null && days <= THIS_WEEK_DAYS
}

function matchesAttention(row: RosterRow, reasons: readonly AttentionReason[]): boolean {
    if (reasons.length === 0) return true
    const attention = row.metrics?.attention
    if (attention === undefined || attention === 'none') return false

    return reasons.includes(attention as AttentionReason)
}

/**
 * Merges identity with training rollups, then filters and sorts.
 *
 * Everything is client-side on purpose: the domain bound is a coach's client
 * list, so even a big roster is a few dozen rows. Paging or server-side sorting
 * would cost a round trip per click to order data already in memory.
 *
 * The three filters AND together. **Within** attention the reasons OR — which is
 * only safe because an athlete carries exactly one of them, so the facet is a
 * partition: the per-reason counts are disjoint and sum exactly to `any`, and no
 * athlete can ever be counted twice.
 */
export function useRoster(
    athletes: readonly CoachUser[],
    metrics: readonly RosterEntry[] | undefined,
    options: RosterFilters & { sort: RosterSort; direction: SortDirection },
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

    const { query, attention, week } = options
    const needle = normalize(query.trim())

    const visible = useMemo(() => {
        const filtered = rows.filter(
            (row) => matchesAttention(row, attention) && (!week || matchesWeek(row)) && matchesQuery(row, needle),
        )

        // A stable final tie-break keeps the order from shuffling between refetches.
        return [...filtered].sort(
            (a, b) => compare(a, b, options.sort, options.direction) || a.user.username.localeCompare(b.user.username),
        )
    }, [rows, needle, attention, week, options.sort, options.direction])

    /**
     * Each facet counts with the *other* controls applied but its own selection
     * ignored. That's what makes the numbers predictive — "tick this and you get
     * four" — rather than self-referential, where a ticked option would only ever
     * report itself and the unticked ones would all read zero.
     */
    const counts = useMemo<RosterCounts>(() => {
        const forAttention = rows.filter((row) => (!week || matchesWeek(row)) && matchesQuery(row, needle))
        const byReason = { stale: 0, neverTrained: 0, lowAdherence: 0 }

        for (const row of forAttention) {
            const reason = row.metrics?.attention
            if (reason && reason !== 'none') byReason[reason as AttentionReason] += 1
        }

        return {
            total: rows.length,
            visible: visible.length,
            attention: {
                ...byReason,
                any: byReason.stale + byReason.neverTrained + byReason.lowAdherence,
            },
            week: rows.filter(
                (row) => matchesAttention(row, attention) && matchesQuery(row, needle) && matchesWeek(row),
            ).length,
        }
    }, [rows, visible.length, needle, attention, week])

    return { rows: visible, counts }
}
