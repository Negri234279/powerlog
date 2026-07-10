'use client'

import { cn } from '@/lib/cn'
import type { AiMesocycleDraft } from '@/lib/graphql/hooks/use-ai-mesocycle'
import { kgTo, type Units } from '@/lib/units'
import { TrackedButton } from '@/components/ui/tracked'

export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6]

type ProposedSet = AiMesocycleDraft['days'][number]['exercises'][number]['sets'][number]

/** Short weekday name for a 0–6 offset (0 = Monday), localized via Intl. */
export function weekdayLabel(offset: number, locale: string): string {
    // 2024-01-01 is a Monday.
    const date = new Date(Date.UTC(2024, 0, 1 + offset))

    return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(date)
}

/** "140kg × 5 @8" / "120kg × 8 · RIR 2" — the same shape as a logged set. */
export function formatTarget(set: ProposedSet, units: Units): string {
    const weight = set.plannedWeightKg === null ? '—' : `${Number(kgTo(units, set.plannedWeightKg).toFixed(1))}${units}`
    const base = `${weight} × ${set.plannedReps ?? '—'}`
    if (set.rpe !== null) return `${base} @${set.rpe}`
    if (set.rir !== null) return `${base} · RIR ${set.rir}`

    return base
}

/** The 0–6 weekday picker, shared by the block and per-week generate forms. */
export function DayToggles({
    selected,
    onToggle,
    disabled,
    locale,
    analyticsId,
}: {
    selected: number[]
    onToggle: (offset: number) => void
    disabled: boolean
    locale: string
    analyticsId: string
}) {
    return (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {WEEKDAYS.map((offset) => (
                <TrackedButton
                    key={offset}
                    analyticsId={analyticsId}
                    type="button"
                    onClick={() => onToggle(offset)}
                    disabled={disabled}
                    aria-pressed={selected.includes(offset)}
                    className={cn(
                        'rounded-full px-3.5 py-1.5 text-sm transition-colors duration-200 disabled:opacity-50',
                        selected.includes(offset)
                            ? 'bg-ember/15 text-ember ring-1 ring-ember/30'
                            : 'text-text-dim ring-1 ring-hairline hover:bg-white/[0.04] hover:text-text',
                    )}
                >
                    {weekdayLabel(offset, locale)}
                </TrackedButton>
            ))}
        </div>
    )
}

/** A proposed training week, day by day. Read-only: the builder is where it is edited. */
export function ProposedWeek({
    draft,
    units,
    locale,
    nameById,
}: {
    draft: AiMesocycleDraft
    units: Units
    locale: string
    /** Localized catalog names. The draft carries the canonical English one. */
    nameById: Map<string, string>
}) {
    // The model answers in its own order; the week reads better chronologically.
    const days = [...draft.days].sort((a, b) => a.dayOffset - b.dayOffset)

    return (
        <div className="space-y-3">
            {days.map((day) => (
                <div key={day.dayOffset} className="rounded-xl bg-bg/40 p-4 ring-1 ring-hairline">
                    <p className="font-mono text-eyebrow uppercase text-text-dim">
                        {weekdayLabel(day.dayOffset, locale)}
                        {day.label ? ` · ${day.label}` : ''}
                    </p>

                    <div className="mt-3 space-y-3">
                        {/* A day may program the same lift twice, so position is the key. */}
                        {day.exercises.map((exercise, index) => (
                            <div key={`${exercise.exerciseId}-${index}`}>
                                <p className="text-sm font-medium text-text">
                                    {nameById.get(exercise.exerciseId) ?? exercise.name}
                                </p>
                                <ul className="mt-1 space-y-0.5">
                                    {exercise.sets.map((set) => (
                                        <li
                                            key={set.order}
                                            className="flex flex-wrap items-baseline gap-x-3 text-sm text-text-dim"
                                        >
                                            <span className="font-mono text-text-faint">{set.order}</span>
                                            <span>{formatTarget(set, units)}</span>
                                            {set.notes ? <span className="text-text-faint">— {set.notes}</span> : null}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}
