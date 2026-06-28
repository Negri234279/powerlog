// Weights are canonical in kg server-side; the user picks a display unit
// (`profile.units` / `me.units`). These helpers convert and format for the UI.
export type Units = 'kg' | 'lb'

const LB_PER_KG = 2.2046226218

/** Coerce the API's string units field to the typed union (defaults to kg). */
export function unitsOf(value: string | null | undefined): Units {
    return value === 'lb' ? 'lb' : 'kg'
}

/** kg → the display unit. */
export function kgTo(units: Units, kg: number): number {
    return units === 'lb' ? kg * LB_PER_KG : kg
}

/** A display-unit value → kg (for sending to logSet/updateSet with unit). */
export function toKg(units: Units, value: number): number {
    return units === 'lb' ? value / LB_PER_KG : value
}

/** Format a kg-canonical weight in the user's units, always with 2 decimals,
 *  e.g. "142.50 kg" / "102.06 kg". `null` → "—". */
export function formatWeight(kg: number | null | undefined, units: Units): string {
    if (kg === null || kg === undefined) return '—'
    return `${kgTo(units, kg).toFixed(2)} ${units}`
}
