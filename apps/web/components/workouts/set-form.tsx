'use client'

import { useTranslations } from 'next-intl'
import { type SubmitEvent, type ReactNode, useState } from 'react'

import type { Units } from '@/lib/units'
import {
    type PlannedField,
    rangeErrorKey,
    scalarErrorKey,
    validatePlanned,
    validateScalar,
} from '@/lib/workouts/planned-validation'
import { Input, Select } from '@/components/ui/field'
import { TrackedButton } from '@/components/ui/tracked'

/** How the set went, as the form models it — `pending` rather than a null. */
export type OutcomeValue = 'pending' | 'success' | 'failed'

/**
 * A set's editable values. Planned targets are ranges carried as their `5` /
 * `5-8` text (weight in the user's display unit); performed values are single
 * numbers, because a set that happened has one weight and one rep count.
 */
export interface SetValues {
    /** Programmed targets (optional), as range text. */
    plannedWeight: string | null
    plannedReps: string | null
    plannedRpe: string | null
    plannedRir: string | null
    weight: number | null
    reps: number | null
    rpe: number | null
    rir: number | null
    outcome: OutcomeValue
}

type Intensity = 'none' | 'rpe' | 'rir'

/** Every validatable field in the form: the performed trio and the planned trio. */
type FieldKey = 'weight' | 'reps' | 'intensity' | 'plannedWeight' | 'plannedReps' | 'plannedIntensity'
const FIELD_KEYS: FieldKey[] = ['weight', 'reps', 'intensity', 'plannedWeight', 'plannedReps', 'plannedIntensity']

const EMPTY: SetValues = {
    plannedWeight: null,
    plannedReps: null,
    plannedRpe: null,
    plannedRir: null,
    weight: null,
    reps: null,
    rpe: null,
    rir: null,
    outcome: 'pending',
}

function parseNum(value: string): number | null {
    const trimmed = value.trim()
    if (trimmed === '') return null
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : null
}

/** Trim to text, or null when blank — the API parses `5` / `5-8` for planned targets. */
function textOrNull(value: string): string | null {
    const trimmed = value.trim()
    return trimmed === '' ? null : trimmed
}

/** Seed a number input: round to 2 decimals (drops float noise from unit
 *  conversion, e.g. 224.9996 → 225) so the field shows a clean value. */
function toInput(value: number | null | undefined): string {
    if (value === null || value === undefined) return ''
    return String(Math.round(value * 100) / 100)
}

/** Which intensity a set carries — works for a performed number or a planned range text. */
function startIntensity(rpe: unknown, rir: unknown): Intensity {
    if (rpe !== null && rpe !== undefined) return 'rpe'
    if (rir !== null && rir !== undefined) return 'rir'
    return 'none'
}

function NumberField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
    return (
        <label className="space-y-1">
            <span className="block font-mono text-[10px] uppercase tracking-widest text-text-dim">{label}</span>
            {children}
            {error ? <p className="max-w-[8rem] text-[10px] leading-tight text-ember">{error}</p> : null}
        </label>
    )
}

/** One labelled half of the form — "done" or "planned". */
function FieldRow({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="rounded-xl bg-white/[0.02] p-3 ring-1 ring-hairline">
            <span className="block font-mono text-eyebrow uppercase tracking-widest text-text-faint">{label}</span>
            <div className="mt-2 flex flex-wrap items-end gap-2.5">{children}</div>
        </div>
    )
}

/** The RPE-or-RIR pair: a kind toggle plus its value. The API takes at most one
 *  of the two, so they can't be separate fields. */
function IntensityFields({
    label,
    kind,
    onKindChange,
    value,
    onValueChange,
    onBlur,
    error,
    range = false,
}: {
    label: string
    kind: Intensity
    onKindChange: (kind: Intensity) => void
    value: string
    onValueChange: (value: string) => void
    onBlur?: () => void
    error?: string
    /** Planned side: the value is a range (`7-8`), so the field takes text. */
    range?: boolean
}) {
    const t = useTranslations('workouts')

    return (
        <>
            <NumberField label={label}>
                <div className="w-24">
                    <Select value={kind} onChange={(e) => onKindChange(e.target.value as Intensity)} onBlur={onBlur}>
                        <option value="none">{t('none')}</option>
                        <option value="rpe">RPE</option>
                        <option value="rir">RIR</option>
                    </Select>
                </div>
            </NumberField>

            {kind !== 'none' ? (
                <NumberField label={kind === 'rpe' ? t('rpeRange') : t('rir')} error={error}>
                    <div className="w-20">
                        {range ? (
                            <Input
                                type="text"
                                inputMode="decimal"
                                value={value}
                                onChange={(e) => onValueChange(e.target.value)}
                                onBlur={onBlur}
                                aria-invalid={error ? true : undefined}
                                placeholder={t('rangePlaceholder')}
                            />
                        ) : (
                            <Input
                                type="number"
                                inputMode="decimal"
                                step={kind === 'rpe' ? '0.5' : '1'}
                                min={0}
                                value={value}
                                onChange={(e) => onValueChange(e.target.value)}
                                onBlur={onBlur}
                                aria-invalid={error ? true : undefined}
                                placeholder="—"
                            />
                        )}
                    </div>
                </NumberField>
            ) : null}
        </>
    )
}

/** Inline set editor — weight (display units) + reps + an RPE/RIR toggle. Used
 *  both to append a set and to edit one in place. */
export function SetForm({
    units,
    initial,
    submitLabel,
    pending,
    onSubmit,
    onCancel,
    showOutcome = false,
    analyticsId,
}: {
    units: Units
    initial?: SetValues
    submitLabel: string
    pending?: boolean
    onSubmit: (values: SetValues) => void
    onCancel?: () => void
    /** Editing only: the outcome is set by marking the set done, and corrected
     *  (or taken back to pending) from here — there is no separate undo. */
    showOutcome?: boolean
    /** Stable id for the submit `ui_click` (e.g. `set-log`); cancel emits `<id>-cancel`. */
    analyticsId: string
}) {
    const t = useTranslations('workouts')
    const start = initial ?? EMPTY
    const [plannedWeight, setPlannedWeight] = useState(start.plannedWeight ?? '')
    const [plannedReps, setPlannedReps] = useState(start.plannedReps ?? '')
    const [weight, setWeight] = useState(toInput(start.weight))
    const [reps, setReps] = useState(start.reps?.toString() ?? '')
    const [intensity, setIntensity] = useState<Intensity>(startIntensity(start.rpe, start.rir))
    const [intensityValue, setIntensityValue] = useState((start.rpe ?? start.rir)?.toString() ?? '')
    const [plannedIntensity, setPlannedIntensity] = useState<Intensity>(
        startIntensity(start.plannedRpe, start.plannedRir),
    )
    const [plannedIntensityValue, setPlannedIntensityValue] = useState(start.plannedRpe ?? start.plannedRir ?? '')
    const [outcome, setOutcome] = useState<OutcomeValue>(start.outcome ?? 'pending')
    // Per-field client validation messages. A field validates on blur; Save
    // re-checks every field at once so the whole set's problems surface together.
    const [errors, setErrors] = useState<Record<string, string>>({})

    const intensityField = (kind: Intensity): PlannedField => (kind === 'rpe' ? 'rpe' : 'rir')

    /** The validation message for one field, or null when it's blank/valid. Planned
     *  cells accept ranges (`5-8`); performed cells accept a single number. */
    function checkField(key: FieldKey): string | null {
        switch (key) {
            case 'weight': {
                const code = validateScalar(weight, 'weight', units)
                return code ? t(scalarErrorKey(code, 'weight')) : null
            }
            case 'reps': {
                const code = validateScalar(reps, 'reps', units)
                return code ? t(scalarErrorKey(code, 'reps')) : null
            }
            case 'intensity': {
                if (intensity === 'none') return null
                const field = intensityField(intensity)
                const code = validateScalar(intensityValue, field, units)
                return code ? t(scalarErrorKey(code, field)) : null
            }
            case 'plannedWeight': {
                const code = validatePlanned(plannedWeight, 'weight', units)
                return code ? t(rangeErrorKey(code, 'weight')) : null
            }
            case 'plannedReps': {
                const code = validatePlanned(plannedReps, 'reps', units)
                return code ? t(rangeErrorKey(code, 'reps')) : null
            }
            case 'plannedIntensity': {
                if (plannedIntensity === 'none') return null
                const field = intensityField(plannedIntensity)
                const code = validatePlanned(plannedIntensityValue, field, units)
                return code ? t(rangeErrorKey(code, field)) : null
            }
        }
    }

    /** Validate one field on blur, setting or clearing just its error. */
    function validateOnBlur(key: FieldKey) {
        setErrors((prev) => {
            const next = { ...prev }
            const message = checkField(key)
            if (message) next[key] = message
            else delete next[key]
            return next
        })
    }

    function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()

        // Check every field up front and surface all problems together, rather than
        // letting the back-end reject one at a time.
        const found: Record<string, string> = {}
        for (const key of FIELD_KEYS) {
            const message = checkField(key)
            if (message) found[key] = message
        }
        setErrors(found)
        if (Object.keys(found).length > 0) return

        const value = parseNum(intensityValue)
        onSubmit({
            plannedWeight: textOrNull(plannedWeight),
            plannedReps: textOrNull(plannedReps),
            plannedRpe: plannedIntensity === 'rpe' ? textOrNull(plannedIntensityValue) : null,
            plannedRir: plannedIntensity === 'rir' ? textOrNull(plannedIntensityValue) : null,
            weight: parseNum(weight),
            reps: parseNum(reps),
            rpe: intensity === 'rpe' ? value : null,
            rir: intensity === 'rir' ? value : null,
            outcome,
        })
    }

    return (
        <form onSubmit={submit} className="space-y-4">
            {/* Two rows, never mixed: what was done, and what was asked for. Read
                as one list of fields they are easy to fill into the wrong half. */}
            <FieldRow label={t('doneSection')}>
                <NumberField label={t('weightLabel', { units })} error={errors['weight']}>
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
                </NumberField>

                <NumberField label={t('reps')} error={errors['reps']}>
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
                </NumberField>

                <IntensityFields
                    label={t('intensity')}
                    kind={intensity}
                    onKindChange={setIntensity}
                    value={intensityValue}
                    onValueChange={setIntensityValue}
                    onBlur={() => validateOnBlur('intensity')}
                    error={errors['intensity']}
                />

                {showOutcome ? (
                    <NumberField label={t('outcomeLabel')}>
                        <div className="w-28">
                            <Select value={outcome} onChange={(e) => setOutcome(e.target.value as OutcomeValue)}>
                                <option value="pending">{t('outcomePending')}</option>
                                <option value="success">{t('outcomeSuccess')}</option>
                                <option value="failed">{t('outcomeFailed')}</option>
                            </Select>
                        </div>
                    </NumberField>
                ) : null}
            </FieldRow>

            <FieldRow label={t('plannedSection')}>
                {/* Planned targets take text so a range like `50-55` keeps its hyphen. */}
                <NumberField label={t('weightLabel', { units })} error={errors['plannedWeight']}>
                    <div className="w-24">
                        <Input
                            type="text"
                            inputMode="decimal"
                            value={plannedWeight}
                            onChange={(e) => setPlannedWeight(e.target.value)}
                            onBlur={() => validateOnBlur('plannedWeight')}
                            aria-invalid={errors['plannedWeight'] ? true : undefined}
                            placeholder={t('rangePlaceholder')}
                        />
                    </div>
                </NumberField>

                <NumberField label={t('reps')} error={errors['plannedReps']}>
                    <div className="w-20">
                        <Input
                            type="text"
                            inputMode="numeric"
                            value={plannedReps}
                            onChange={(e) => setPlannedReps(e.target.value)}
                            onBlur={() => validateOnBlur('plannedReps')}
                            aria-invalid={errors['plannedReps'] ? true : undefined}
                            placeholder={t('rangePlaceholder')}
                        />
                    </div>
                </NumberField>

                <IntensityFields
                    label={t('intensity')}
                    kind={plannedIntensity}
                    onKindChange={setPlannedIntensity}
                    value={plannedIntensityValue}
                    onValueChange={setPlannedIntensityValue}
                    onBlur={() => validateOnBlur('plannedIntensity')}
                    error={errors['plannedIntensity']}
                    range
                />
            </FieldRow>

            <div className="flex items-center gap-2">
                <TrackedButton
                    analyticsId={analyticsId}
                    type="submit"
                    disabled={pending}
                    className="rounded-full bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-text ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.1] disabled:opacity-60"
                >
                    {submitLabel}
                </TrackedButton>
                {onCancel ? (
                    <TrackedButton
                        analyticsId={`${analyticsId}-cancel`}
                        type="button"
                        onClick={onCancel}
                        className="rounded-full px-3 py-2.5 text-sm text-text-dim transition-colors duration-300 hover:text-text"
                    >
                        {t('cancel')}
                    </TrackedButton>
                ) : null}
            </div>
        </form>
    )
}
