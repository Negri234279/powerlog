'use client'

import { type FormEvent, type ReactNode, useState } from 'react'

import type { Units } from '@/lib/units'
import { Input, Select } from '@/components/ui/field'
import { TrackedButton } from '@/components/ui/tracked'

/** A set's editable values, in the user's display unit (weight) + unitless intensity. */
export interface SetValues {
    weight: number | null
    reps: number | null
    rpe: number | null
    rir: number | null
}

type Intensity = 'none' | 'rpe' | 'rir'

const EMPTY: SetValues = { weight: null, reps: null, rpe: null, rir: null }

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

function startIntensity(values: SetValues): Intensity {
    if (values.rpe !== null) return 'rpe'
    if (values.rir !== null) return 'rir'
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

/** Inline set editor — weight (display units) + reps + an RPE/RIR toggle. Used
 *  both to append a set and to edit one in place. */
export function SetForm({
    units,
    initial,
    submitLabel,
    pending,
    onSubmit,
    onCancel,
    analyticsId,
}: {
    units: Units
    initial?: SetValues
    submitLabel: string
    pending?: boolean
    onSubmit: (values: SetValues) => void
    onCancel?: () => void
    /** Stable id for the submit `ui_click` (e.g. `set-log`); cancel emits `<id>-cancel`. */
    analyticsId: string
}) {
    const start = initial ?? EMPTY
    const [weight, setWeight] = useState(toInput(start.weight))
    const [reps, setReps] = useState(start.reps?.toString() ?? '')
    const [intensity, setIntensity] = useState<Intensity>(startIntensity(start))
    const [intensityValue, setIntensityValue] = useState((start.rpe ?? start.rir)?.toString() ?? '')

    function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const value = parseNum(intensityValue)
        onSubmit({
            weight: parseNum(weight),
            reps: parseNum(reps),
            rpe: intensity === 'rpe' ? value : null,
            rir: intensity === 'rir' ? value : null,
        })
    }

    return (
        <form onSubmit={submit} className="flex flex-wrap items-end gap-2.5">
            <NumberField label={`Weight (${units})`}>
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

            <NumberField label="Reps">
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

            <NumberField label="Intensity">
                <div className="w-24">
                    <Select value={intensity} onChange={(e) => setIntensity(e.target.value as Intensity)}>
                        <option value="none">None</option>
                        <option value="rpe">RPE</option>
                        <option value="rir">RIR</option>
                    </Select>
                </div>
            </NumberField>

            {intensity !== 'none' ? (
                <NumberField label={intensity === 'rpe' ? 'RPE (0–10)' : 'RIR'}>
                    <div className="w-20">
                        <Input
                            type="number"
                            inputMode="decimal"
                            step={intensity === 'rpe' ? '0.5' : '1'}
                            min={0}
                            value={intensityValue}
                            onChange={(e) => setIntensityValue(e.target.value)}
                            placeholder="—"
                        />
                    </div>
                </NumberField>
            ) : null}

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
                        Cancel
                    </TrackedButton>
                ) : null}
            </div>
        </form>
    )
}
