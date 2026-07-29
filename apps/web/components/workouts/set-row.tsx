'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { type WorkoutSetData, useLogSet, useRemoveSet, useUpdateSet } from '@/lib/graphql/hooks/use-workouts'
import { formatRange, formatWeightRange } from '@/lib/range'
import { formatWeight, kgTo, type Units } from '@/lib/units'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Check } from '@/components/ui/icons'
import { Menu, type MenuItem } from '@/components/ui/menu'
import { TrackedButton } from '@/components/ui/tracked'
import { CompleteSetModal } from './complete-set-modal'
import { SetForm, type OutcomeValue, type SetValues } from './set-form'

function intensitySuffix(set: WorkoutSetData): string {
    if (set.rpe !== null) return ` @${set.rpe}`
    if (set.rir !== null) return ` · ${set.rir} RIR`
    return ''
}

function plannedIntensitySuffix(set: WorkoutSetData): string {
    if (set.plannedRpe) return ` @${formatRange(set.plannedRpe)}`
    if (set.plannedRir) return ` · ${formatRange(set.plannedRir)} RIR`
    return ''
}

/** How the set reads at a glance: green for done, red for failed, plain for pending. */
function outcomeTone(outcome: string | null): string {
    if (outcome === 'success') return 'text-pr'
    if (outcome === 'failed') return 'text-ember'
    return 'text-text'
}

/** The set's planned targets as the form and API want them: range text in display
 *  units, or null when absent (the form reads '' as present, so an absent target
 *  must be null). Shared by the edit seed and duplicate — both carry the plan
 *  forward. */
function plannedSeed(set: WorkoutSetData, units: Units) {
    return {
        plannedWeight: set.plannedWeightKg ? formatWeightRange(set.plannedWeightKg, units) : null,
        plannedReps: set.plannedReps ? formatRange(set.plannedReps) : null,
        plannedRpe: set.plannedRpe ? formatRange(set.plannedRpe) : null,
        plannedRir: set.plannedRir ? formatRange(set.plannedRir) : null,
    }
}

/** The row's transient UI, and only ever one of them at a time: editing replaces
 *  the row, marking and removing each open their own dialog. */
type RowMode = 'idle' | 'editing' | 'marking' | 'removing'

export function SetRow({
    sessionId,
    entryId,
    set,
    index,
    units,
    locked,
}: {
    sessionId: string
    entryId: string
    set: WorkoutSetData
    index: number
    units: Units
    /** Completed session in read-only mode: hide every mutating control. */
    locked: boolean
}) {
    const t = useTranslations('workouts')
    const update = useUpdateSet()
    const remove = useRemoveSet()
    const duplicate = useLogSet()
    const [mode, setMode] = useState<RowMode>('idle')
    const done = set.outcome !== null

    // Duplicate carries only the planned targets over to a fresh pending set — you
    // still log what you actually did.
    function onDuplicate() {
        if (duplicate.isPending) return
        duplicate.mutate({ sessionId, entryId, ...plannedSeed(set, units), unit: units })
    }

    function onEdit(v: SetValues) {
        update.mutate(
            {
                sessionId,
                entryId,
                setId: set.id,
                plannedWeight: v.plannedWeight,
                plannedReps: v.plannedReps,
                plannedRpe: v.plannedRpe,
                plannedRir: v.plannedRir,
                weight: v.weight,
                reps: v.reps,
                rpe: v.rpe,
                rir: v.rir,
                // `pending` is the API's null: the edit is where a set goes back to unmarked.
                outcome: v.outcome === 'pending' ? null : v.outcome,
                unit: units,
            },
            { onSuccess: () => setMode('idle') },
        )
    }

    const menuItems: MenuItem[] = [
        ...(done
            ? []
            : [{ label: t('markDone'), analyticsId: 'set-complete-menu', onSelect: () => setMode('marking') }]),
        { label: t('duplicate'), analyticsId: 'set-duplicate', onSelect: onDuplicate },
        { label: t('edit'), analyticsId: 'set-edit', onSelect: () => setMode('editing') },
        {
            label: t('removeSet'),
            analyticsId: 'set-remove-open',
            onSelect: () => setMode('removing'),
            destructive: true,
        },
    ]

    // Re-locking mid-edit closes the form rather than leaving it hanging.
    if (mode === 'editing' && !locked) {
        const initial: SetValues = {
            ...plannedSeed(set, units),
            weight: set.weightKg === null ? null : kgTo(units, set.weightKg),
            reps: set.reps,
            rpe: set.rpe,
            rir: set.rir,
            outcome: (set.outcome ?? 'pending') as OutcomeValue,
        }

        return (
            <li className="py-2.5">
                <SetForm
                    analyticsId="set-update"
                    units={units}
                    submitLabel={update.isPending ? t('saving') : t('save')}
                    pending={update.isPending}
                    showOutcome
                    initial={initial}
                    onCancel={() => setMode('idle')}
                    onSubmit={onEdit}
                />
            </li>
        )
    }

    const hasPlanned =
        set.plannedWeightKg !== null || set.plannedReps !== null || set.plannedRpe !== null || set.plannedRir !== null

    return (
        <li className="flex items-center gap-3 py-2.5 font-mono text-sm tabular-nums">
            <span className="w-5 self-start pt-0.5 text-text-faint">{index + 1}</span>
            {/* Done on top, planned under it — never the same line: at a glance the
                question is what happened, and the plan is what it's measured against. */}
            <div className="min-w-0 flex-1 space-y-0.5">
                <div className={outcomeTone(set.outcome)}>
                    {formatWeight(set.weightKg, units)}
                    <span className={done ? 'opacity-70' : 'text-text-faint'}> × {set.reps ?? '—'}</span>
                    <span className={done ? 'opacity-70' : 'text-text-dim'}>{intensitySuffix(set)}</span>
                </div>
                {hasPlanned ? (
                    <div className="text-xs text-text-faint">
                        <span className="mr-1.5 text-[10px] uppercase tracking-widest">{t('planPrefix')}</span>
                        {formatWeightRange(set.plannedWeightKg, units, '—')} {units} ×{' '}
                        {formatRange(set.plannedReps, { empty: '—' })}
                        {plannedIntensitySuffix(set)}
                    </div>
                ) : null}
            </div>
            {set.e1rmKg !== null ? (
                <span className="hidden self-start text-right text-text-dim sm:block">
                    e1RM {formatWeight(set.e1rmKg, units)}
                </span>
            ) : null}

            {locked || done ? null : (
                <TrackedButton
                    analyticsId="set-complete-open"
                    type="button"
                    onClick={() => setMode('marking')}
                    aria-label={t('markDone')}
                    className="inline-flex items-center gap-1 self-center rounded-full px-2 py-1 text-xs text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-pr/10 hover:text-pr sm:px-2.5"
                >
                    {/* Icon-only on mobile so it doesn't squeeze the set/plan line into
                        wrapping; the label returns from sm up. */}
                    <Check className="size-3" />
                    <span className="hidden sm:inline">{t('markDone')}</span>
                </TrackedButton>
            )}

            {/* Duplicate / edit / remove live behind one ⋮ — the row already stacks
                two lines and keeps "mark done" as its one prominent verb. */}
            {locked ? null : (
                <div className="shrink-0 self-center">
                    <Menu analyticsId="set-actions" label={t('setActions')} items={menuItems} />
                </div>
            )}

            <ConfirmModal
                analyticsId="set-remove"
                open={mode === 'removing'}
                onClose={() => setMode('idle')}
                onConfirm={() =>
                    remove.mutate({ sessionId, entryId, setId: set.id }, { onSuccess: () => setMode('idle') })
                }
                title={t('setRemoveTitle', { index: index + 1 })}
                description={t('setRemoveBody')}
                confirmLabel={t('removeSet')}
                cancelLabel={t('cancel')}
                destructive
                pending={remove.isPending}
            />

            {/* Mounted only while open so the form always seeds from the set as it
                is right now, rather than from whatever it was on first render. */}
            {mode === 'marking' ? (
                <CompleteSetModal
                    open
                    onClose={() => setMode('idle')}
                    sessionId={sessionId}
                    entryId={entryId}
                    set={set}
                    index={index}
                    units={units}
                />
            ) : null}
        </li>
    )
}
