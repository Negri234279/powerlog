'use client'

import { useTranslations } from 'next-intl'
import { type SubmitEvent, useId, useState } from 'react'

import { cn } from '@/lib/cn'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
import { type WorkoutSetData, useCompleteSet } from '@/lib/graphql/hooks/use-workouts'
import { formatRange, formatWeightRange, rangeMin } from '@/lib/range'
import { kgTo, type Units } from '@/lib/units'
import { type PlannedField, scalarErrorKey, validateScalar } from '@/lib/workouts/planned-validation'
import { FormError } from '@/components/ui/form-error'
import { Input, Select } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { TrackedButton } from '@/components/ui/tracked'

type Outcome = 'success' | 'failed'
type Intensity = 'none' | 'rpe' | 'rir'

function parseNum(value: string): number | null {
    const trimmed = value.trim()
    if (trimmed === '') return null
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : null
}

/** Round off the float noise unit conversion leaves behind (224.9996 → 225). */
function toInput(value: number | null): string {
    if (value === null) return ''
    return String(Math.round(value * 100) / 100)
}

/**
 * Seed the form from what the set already knows: whatever the athlete logged
 * beforehand, else the target they were given. Prefilling from the plan is the
 * point — the common case is "I did exactly what it said", which should be one
 * click, and a deviation is an edit away.
 *
 * A performed value is a single number; a planned one is a range, so the prefill
 * starts at its floor (`5-8` → 5) — the number to beat, which the athlete edits up.
 */
function seed(set: WorkoutSetData, units: Units) {
    const weightKg = set.weightKg ?? rangeMin(set.plannedWeightKg)
    const rpe = set.rpe ?? rangeMin(set.plannedRpe)
    const rir = set.rir ?? rangeMin(set.plannedRir)

    return {
        weight: toInput(weightKg === null ? null : kgTo(units, weightKg)),
        reps: (set.reps ?? rangeMin(set.plannedReps))?.toString() ?? '',
        intensity: (rpe !== null ? 'rpe' : rir !== null ? 'rir' : 'none') as Intensity,
        intensityValue: (rpe ?? rir)?.toString() ?? '',
    }
}

function OutcomeChoice({ outcome, onChange }: { outcome: Outcome; onChange: (outcome: Outcome) => void }) {
    const t = useTranslations('workouts')
    const options: { value: Outcome; label: string; active: string }[] = [
        { value: 'success', label: t('outcomeSuccess'), active: 'bg-pr/15 text-pr ring-pr/40' },
        { value: 'failed', label: t('outcomeFailed'), active: 'bg-ember/15 text-ember ring-ember/40' },
    ]

    return (
        <div className="flex gap-2" role="radiogroup" aria-label={t('outcomeLabel')}>
            {options.map((option) => (
                <TrackedButton
                    key={option.value}
                    analyticsId={`set-outcome-${option.value}`}
                    type="button"
                    role="radio"
                    aria-checked={outcome === option.value}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        'flex-1 rounded-full px-4 py-2.5 text-sm font-medium ring-1 transition-colors duration-300',
                        outcome === option.value
                            ? option.active
                            : 'text-text-dim ring-hairline hover:bg-white/[0.04] hover:text-text',
                    )}
                >
                    {option.label}
                </TrackedButton>
            ))}
        </div>
    )
}

/**
 * The "mark this set done" dialog: pick success or failed, confirm (or correct)
 * what was actually lifted. The targets are shown but never edited here — the
 * plan is what the performance is judged against.
 */
export function CompleteSetModal({
    open,
    onClose,
    sessionId,
    entryId,
    set,
    index,
    units,
}: {
    open: boolean
    onClose: () => void
    sessionId: string
    entryId: string
    set: WorkoutSetData
    index: number
    units: Units
}) {
    const t = useTranslations('workouts')
    const titleId = useId()
    const errorMessage = useErrorMessage()
    const complete = useCompleteSet()
    const start = seed(set, units)

    const [outcome, setOutcome] = useState<Outcome>('success')
    const [weight, setWeight] = useState(start.weight)
    const [reps, setReps] = useState(start.reps)
    const [intensity, setIntensity] = useState<Intensity>(start.intensity)
    const [intensityValue, setIntensityValue] = useState(start.intensityValue)
    const [error, setError] = useState<string | null>(null)
    // Per-field client validation messages. Performed values are single numbers,
    // validated on blur and all together on submit before the mutation runs.
    const [errors, setErrors] = useState<Record<string, string>>({})

    /** The message for one performed field, or null when blank/valid. */
    function checkField(key: 'weight' | 'reps' | 'intensity'): string | null {
        if (key === 'weight') {
            const code = validateScalar(weight, 'weight', units)
            return code ? t(scalarErrorKey(code, 'weight')) : null
        }
        if (key === 'reps') {
            const code = validateScalar(reps, 'reps', units)
            return code ? t(scalarErrorKey(code, 'reps')) : null
        }
        if (intensity === 'none') return null
        const field: PlannedField = intensity === 'rpe' ? 'rpe' : 'rir'
        const code = validateScalar(intensityValue, field, units)
        return code ? t(scalarErrorKey(code, field)) : null
    }

    function validateOnBlur(key: 'weight' | 'reps' | 'intensity') {
        setErrors((prev) => {
            const next = { ...prev }
            const message = checkField(key)
            if (message) next[key] = message
            else delete next[key]
            return next
        })
    }

    async function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)

        const found: Record<string, string> = {}
        for (const key of ['weight', 'reps', 'intensity'] as const) {
            const message = checkField(key)
            if (message) found[key] = message
        }
        setErrors(found)
        if (Object.keys(found).length > 0) return

        const value = parseNum(intensityValue)
        try {
            await complete.mutateAsync({
                sessionId,
                entryId,
                setId: set.id,
                outcome,
                weight: parseNum(weight),
                reps: parseNum(reps),
                rpe: intensity === 'rpe' ? value : null,
                rir: intensity === 'rir' ? value : null,
                unit: units,
            })
            onClose()
        } catch (e) {
            setError(errorMessage(e))
        }
    }

    const planned =
        set.plannedWeightKg !== null || set.plannedReps !== null || set.plannedRpe !== null || set.plannedRir !== null

    return (
        <Modal open={open} onClose={onClose} labelledBy={titleId}>
            <h2 id={titleId} className="font-display text-h3 tracking-tight">
                {t('completeSetTitle', { index: index + 1 })}
            </h2>

            {planned ? (
                <p className="mt-1 font-mono text-sm tabular-nums text-text-dim">
                    {t('planPrefix')} {formatWeightRange(set.plannedWeightKg, units, '—')} {units} ×{' '}
                    {formatRange(set.plannedReps, { empty: '—' })}
                    {set.plannedRpe ? ` @${formatRange(set.plannedRpe)}` : ''}
                    {set.plannedRir ? ` · ${formatRange(set.plannedRir)} RIR` : ''}
                </p>
            ) : null}

            <form onSubmit={submit} className="mt-5 space-y-4">
                <OutcomeChoice outcome={outcome} onChange={setOutcome} />

                <div className="flex flex-wrap items-start gap-2.5">
                    <label className="space-y-1">
                        <span className="block font-mono text-[10px] uppercase tracking-widest text-text-dim">
                            {t('weightLabel', { units })}
                        </span>
                        <div className="w-24">
                            <Input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                min={0}
                                value={weight}
                                onChange={(e) => setWeight(e.target.value)}
                                onBlur={() => validateOnBlur('weight')}
                                aria-invalid={errors['weight'] ? true : undefined}
                                placeholder="0"
                            />
                        </div>
                        {errors['weight'] ? (
                            <p className="max-w-[6rem] text-[10px] leading-tight text-ember">{errors['weight']}</p>
                        ) : null}
                    </label>

                    <label className="space-y-1">
                        <span className="block font-mono text-[10px] uppercase tracking-widest text-text-dim">
                            {t('reps')}
                        </span>
                        <div className="w-20">
                            <Input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                value={reps}
                                onChange={(e) => setReps(e.target.value)}
                                onBlur={() => validateOnBlur('reps')}
                                aria-invalid={errors['reps'] ? true : undefined}
                                placeholder="0"
                            />
                        </div>
                        {errors['reps'] ? (
                            <p className="max-w-[6rem] text-[10px] leading-tight text-ember">{errors['reps']}</p>
                        ) : null}
                    </label>

                    <label className="space-y-1">
                        <span className="block font-mono text-[10px] uppercase tracking-widest text-text-dim">
                            {t('intensity')}
                        </span>
                        <div className="w-24">
                            <Select
                                value={intensity}
                                onChange={(e) => setIntensity(e.target.value as Intensity)}
                                onBlur={() => validateOnBlur('intensity')}
                            >
                                <option value="none">{t('none')}</option>
                                <option value="rpe">RPE</option>
                                <option value="rir">RIR</option>
                            </Select>
                        </div>
                    </label>

                    {intensity !== 'none' ? (
                        <label className="space-y-1">
                            <span className="block font-mono text-[10px] uppercase tracking-widest text-text-dim">
                                {intensity === 'rpe' ? t('rpeRange') : t('rir')}
                            </span>
                            <div className="w-20">
                                <Input
                                    type="number"
                                    inputMode="decimal"
                                    step={intensity === 'rpe' ? '0.5' : '1'}
                                    min={0}
                                    value={intensityValue}
                                    onChange={(e) => setIntensityValue(e.target.value)}
                                    onBlur={() => validateOnBlur('intensity')}
                                    aria-invalid={errors['intensity'] ? true : undefined}
                                    placeholder="—"
                                />
                            </div>
                            {errors['intensity'] ? (
                                <p className="max-w-[6rem] text-[10px] leading-tight text-ember">
                                    {errors['intensity']}
                                </p>
                            ) : null}
                        </label>
                    ) : null}
                </div>

                <FormError error={error} />

                <div className="flex items-center justify-end gap-2 pt-1">
                    <TrackedButton
                        analyticsId="set-complete-cancel"
                        type="button"
                        onClick={onClose}
                        disabled={complete.isPending}
                        className="rounded-full px-4 py-2 text-sm text-text-dim transition-colors duration-300 hover:text-text disabled:opacity-60"
                    >
                        {t('cancel')}
                    </TrackedButton>
                    <TrackedButton
                        analyticsId="set-complete-confirm"
                        type="submit"
                        disabled={complete.isPending}
                        className="rounded-full bg-pr/15 px-4 py-2 text-sm font-medium text-pr ring-1 ring-pr/30 transition-colors duration-300 hover:bg-pr/25 disabled:opacity-60"
                    >
                        {complete.isPending ? t('saving') : t('confirmDone')}
                    </TrackedButton>
                </div>
            </form>
        </Modal>
    )
}
