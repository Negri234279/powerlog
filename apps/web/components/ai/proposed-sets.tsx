'use client'

import { formatTarget } from '@/components/workouts/mesocycle-ai-shared'
import type { Units } from '@/lib/units'

/** A proposed set, addressed positionally within its exercise entry. */
export interface ProposedEntry {
    entryId: string
    /** The lift's localized name; empty when the session no longer names it. */
    name: string
    sets: {
        order: number
        plannedWeightKg: number | null
        plannedReps: number | null
        rpe: number | null
        rir: number | null
        notes: string | null
    }[]
}

/**
 * What the model would program for a session, per exercise.
 *
 * Shared by the session panel and the history's detail screen on purpose: a
 * proposal that renders differently in the two places is a proposal the user
 * can't be sure is the same one. `formatTarget` comes from the mesocycle shared
 * module so all three surfaces phrase a target identically.
 */
export function ProposedSets({ entries, units }: { entries: ProposedEntry[]; units: Units }) {
    return (
        <div className="space-y-4">
            {entries.map((entry) => (
                <div key={entry.entryId}>
                    {entry.name ? <p className="font-mono text-eyebrow uppercase text-text-dim">{entry.name}</p> : null}
                    <ul className="mt-2 space-y-1">
                        {entry.sets.map((proposed) => (
                            <li
                                key={proposed.order}
                                className="flex flex-wrap items-baseline gap-x-3 text-sm text-text"
                            >
                                <span className="font-mono text-text-faint">{proposed.order}</span>
                                <span>{formatTarget(proposed, units)}</span>
                                {proposed.notes ? <span className="text-text-dim">— {proposed.notes}</span> : null}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}
        </div>
    )
}

/**
 * Group a draft's flat set list by exercise entry, in the session's own order.
 *
 * `names` resolves an entry to its lift. When the session is gone — deleted
 * since the conversation happened — the caller passes an empty map and the sets
 * still render, unnamed, rather than disappearing.
 */
export function groupByEntry<S extends ProposedEntry['sets'][number] & { entryId: string }>(
    sets: readonly S[],
    order: readonly string[],
    names: Map<string, string>,
): ProposedEntry[] {
    const byEntry = new Map<string, S[]>()
    for (const set of sets) {
        const list = byEntry.get(set.entryId) ?? []
        list.push(set)
        byEntry.set(set.entryId, list)
    }

    // Entries the session still knows come first, in its order; anything left
    // belongs to a set the session no longer has, and is appended rather than
    // dropped.
    const known = order.filter((entryId) => byEntry.has(entryId))
    const orphans = [...byEntry.keys()].filter((entryId) => !order.includes(entryId))

    return [...known, ...orphans].map((entryId) => ({
        entryId,
        name: names.get(entryId) ?? '',
        sets: byEntry
            .get(entryId)!
            .slice()
            .sort((a, b) => a.order - b.order),
    }))
}
