'use client'

import { useTranslations } from 'next-intl'
import { type FormEvent, type ReactNode, useState } from 'react'

import type { Units } from '@/lib/units'
import { Input, Select } from '@/components/ui/field'
import { TrackedButton } from '@/components/ui/tracked'

/** How the set went, as the form models it — `pending` rather than a null. */
export type OutcomeValue = 'pending' | 'success' | 'failed'

/** A set's editable values, in the user's display unit (weight) + unitless intensity. */
export interface SetValues {
    /** Programmed targets (optional). */
    plannedWeight: number | null
    plannedReps: number | null
    plannedRpe: number | null
    plannedRir: number | null
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

/** Seed a number input: round to 2 decimals (drops float noise from unit
 *  conversion, e.g. 224.9996 → 225) so the field shows a clean value. */
function toInput(value: number | null | undefined): string {
    if (value === null || value === undefined) return ''
    return String(Math.round(value * 100) / 100)
}

function startIntensity(rpe: number | null, rir: number | null): Intensity {
    if (rpe !== null) return 'rpe'
    if (rir !== null) return 'rir'
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
}: {
    label: string
    kind: Intensity
    onKindChange: (kind: Intensity) => void
    value: string
    onValueChange: (value: string) => void
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
                        <Input
                            type="number"
                            inputMode="decimal"
                            step={kind === 'rpe' ? '0.5' : '1'}
                            min={0}
                            value={value}
                            onChange={(e) => onValueChange(e.target.value)}
                            placeholder="—"
                        />
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
    const [plannedWeight, setPlannedWeight] = useState(toInput(start.plannedWeight))
    const [plannedReps, setPlannedReps] = useState(start.plannedReps?.toString() ?? '')
    const [weight, setWeight] = useState(toInput(start.weight))
    const [reps, setReps] = useState(start.reps?.toString() ?? '')
    const [intensity, setIntensity] = useState<Intensity>(startIntensity(start.rpe, start.rir))
    const [intensityValue, setIntensityValue] = useState((start.rpe ?? start.rir)?.toString() ?? '')
    const [plannedIntensity, setPlannedIntensity] = useState<Intensity>(
        startIntensity(start.plannedRpe, start.plannedRir),
    )
    const [plannedIntensityValue, setPlannedIntensityValue] = useState(
        (start.plannedRpe ?? start.plannedRir)?.toString() ?? '',
    )
    const [outcome, setOutcome] = useState<OutcomeValue>(start.outcome ?? 'pending')

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const value = parseNum(intensityValue)
        const plannedValue = parseNum(plannedIntensityValue)
        onSubmit({
            plannedWeight: parseNum(plannedWeight),
            plannedReps: parseNum(plannedReps),
            plannedRpe: plannedIntensity === 'rpe' ? plannedValue : null,
            plannedRir: plannedIntensity === 'rir' ? plannedValue : null,
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
                <NumberField label={t('weightLabel', { units })}>
                    <div className="w-24">
                        <Input
                            type="number"
                            inputMode="decimal"
                            step="any"
                            min={0}
                            value={plannedWeight}
                            onChange={(e) => setPlannedWeight(e.target.value)}
                            placeholder="—"
                        />
                    </div>
                </NumberField>

                <NumberField label={t('reps')}>
                    <div className="w-20">
                        <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={plannedReps}
                            onChange={(e) => setPlannedReps(e.target.value)}
                            placeholder="—"
                        />
                    </div>
                </NumberField>

                <IntensityFields
                    label={t('intensity')}
                    kind={plannedIntensity}
                    onKindChange={setPlannedIntensity}
                    value={plannedIntensityValue}
                    onValueChange={setPlannedIntensityValue}
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
