'use client'

import { useTranslations } from 'next-intl'
import { type SubmitEvent, type ReactNode, useState } from 'react'

import type { Units } from '@/lib/units'
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

function NumberField({ label, children }: { label: string; children: ReactNode }) {
    return (
        <label className="space-y-1">
            <span className="block font-mono text-[10px] uppercase tracking-widest text-text-dim">{label}</span>
            {children}
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
    range = false,
}: {
    label: string
    kind: Intensity
    onKindChange: (kind: Intensity) => void
    value: string
    onValueChange: (value: string) => void
    /** Planned side: the value is a range (`7-8`), so the field takes text. */
    range?: boolean
}) {
    const t = useTranslations('workouts')

    return (
        <>
            <NumberField label={label}>
                <div className="w-24">
                    <Select value={kind} onChange={(e) => onKindChange(e.target.value as Intensity)}>
                        <option value="none">{t('none')}</option>
                        <option value="rpe">RPE</option>
                        <option value="rir">RIR</option>
                    </Select>
                </div>
            </NumberField>

            {kind !== 'none' ? (
                <NumberField label={kind === 'rpe' ? t('rpeRange') : t('rir')}>
                    <div className="w-20">
                        {range ? (
                            <Input
                                type="text"
                                inputMode="decimal"
                                value={value}
                                onChange={(e) => onValueChange(e.target.value)}
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

    function submit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
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
                <NumberField label={t('weightLabel', { units })}>
                    <div className="w-24">
                        <Input
                            type="number"
                            inputMode="decimal"
                            step="any"
                            min={0}
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="0"
                        />
                    </div>
                </NumberField>

                <NumberField label={t('reps')}>
                    <div className="w-20">
                        <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={reps}
                            onChange={(e) => setReps(e.target.value)}
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
                <NumberField label={t('weightLabel', { units })}>
                    <div className="w-24">
                        <Input
                            type="text"
                            inputMode="decimal"
                            value={plannedWeight}
                            onChange={(e) => setPlannedWeight(e.target.value)}
                            placeholder={t('rangePlaceholder')}
                        />
                    </div>
                </NumberField>

                <NumberField label={t('reps')}>
                    <div className="w-20">
                        <Input
                            type="text"
                            inputMode="numeric"
                            value={plannedReps}
                            onChange={(e) => setPlannedReps(e.target.value)}
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
