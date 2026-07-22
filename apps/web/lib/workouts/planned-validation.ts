// Client-side validation for the planned range fields (weight / reps / RPE / RIR)
// of the template + mesocycle builders. Mirrors the domain VOs so the user is
// told what's wrong before the mutation — and told about every field at once,
// rather than one back-end error at a time. Weight is validated in the user's
// display unit and converted to kg for the bound check, matching what the API
// does on the way in.

import { toKg, type Units } from '../units'

/** Which planned field is being checked — picks the bounds rule + message. */
export type PlannedField = 'weight' | 'reps' | 'rpe' | 'rir'

/**
 * Why a field is invalid, as a stable code the UI turns into a localized message:
 * `format` (not a number or `n-n` pair), `reversed` (low bound above high), or
 * `bounds` (a value outside the field's allowed range/step).
 */
export type PlannedErrorCode = 'format' | 'reversed' | 'bounds'

const PART = /^\d+(?:[.,]\d+)?$/
const MAX_WEIGHT_KG = 1000

interface Bounds {
    min: number
    max: number
}

/** Parse `5` / `5-8` into its bounds, or null when the shape is wrong. */
function parseBounds(text: string): Bounds | null {
    const parts = text.split('-').map((part) => part.trim())
    if (parts.length > 2 || parts.some((part) => !PART.test(part))) {
        return null
    }

    const numbers = parts.map((part) => Number(part.replace(',', '.')))

    return {
        min: numbers[0]!,
        max: numbers[numbers.length - 1]!,
    }
}

function bothBounds(bounds: Bounds, ok: (value: number) => boolean): boolean {
    return ok(bounds.min) && ok(bounds.max)
}

/** Whether both bounds satisfy the field's own rule (integer/step + min/max). */
function withinBounds(bounds: Bounds, field: PlannedField, units: Units): boolean {
    switch (field) {
        case 'reps':
            return bothBounds(bounds, (n) => Number.isInteger(n) && n >= 1 && n <= 1000)
        case 'rpe':
            return bothBounds(bounds, (n) => n >= 0 && n <= 10 && (n * 2) % 1 === 0)
        case 'rir':
            return bothBounds(bounds, (n) => Number.isInteger(n) && n >= 0 && n <= 50)
        case 'weight':
            return bothBounds(bounds, (n) => {
                const kg = toKg(units, n)
                return kg >= 0 && kg <= MAX_WEIGHT_KG
            })
    }
}

/**
 * Validate one planned field's text. Blank is valid — the target is optional —
 * so callers get `null` for both "empty" and "correct". `units` only matters for
 * `weight` (its bound is a kg cap), ignored for the rest.
 */
export function validatePlanned(text: string, field: PlannedField, units: Units): PlannedErrorCode | null {
    const trimmed = text.trim()
    if (trimmed === '') {
        return null
    }

    const bounds = parseBounds(trimmed)
    if (!bounds) {
        return 'format'
    }

    if (bounds.min > bounds.max) {
        return 'reversed'
    }

    if (!withinBounds(bounds, field, units)) {
        return 'bounds'
    }

    return null
}

/** The i18n key (in the `workouts` namespace) for a validation code on a field. */
export function rangeErrorKey(code: PlannedErrorCode, field: PlannedField): string {
    if (code === 'format') return 'errRangeFormat'
    if (code === 'reversed') return 'errRangeReversed'

    switch (field) {
        case 'reps':
            return 'errRangeReps'
        case 'weight':
            return 'errRangeWeight'
        case 'rpe':
            return 'errRangeRpe'
        case 'rir':
            return 'errRangeRir'
    }
}

// ── Draft-set helpers shared by the template + mesocycle builders ──────────

export type IntensityKind = 'none' | 'rpe' | 'rir'

/** The shape both builders' draft sets share (they carry extra fields too). */
export interface PlannedSetDraft {
    key: string
    weight: string
    reps: string
    intensityKind: IntensityKind
    intensity: string
}

/** The editable planned cells of a set, in column order. */
export type SetField = 'weight' | 'reps' | 'intensity'
export const SET_FIELDS: SetField[] = ['weight', 'reps', 'intensity']

/**
 * What to validate for one set cell: the error-map key, the domain rule to apply,
 * and the text to check. Intensity resolves to RPE or RIR by the set's kind, and
 * yields null when 'none' (nothing to validate, and its error must be cleared).
 */
export function fieldSpec(
    set: PlannedSetDraft,
    field: SetField,
): { key: string; planned: PlannedField; text: string } | null {
    if (field === 'weight')
        return {
            key: fieldKey(set.key, 'weight'),
            planned: 'weight',
            text: set.weight,
        }

    if (field === 'reps')
        return {
            key: fieldKey(set.key, 'reps'),
            planned: 'reps',
            text: set.reps,
        }

    if (set.intensityKind === 'none') return null

    return {
        key: fieldKey(set.key, 'intensity'),
        planned: set.intensityKind === 'rpe' ? 'rpe' : 'rir',
        text: set.intensity,
    }
}

/** Stable error-map key for a cell, whatever its current validation state. */
export function fieldKey(setKey: string, field: SetField): string {
    return `${setKey}.${field}`
}
