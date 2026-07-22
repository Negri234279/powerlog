// Planned targets are ranges: `5` when the bounds coincide, `5-8` when they
// don't. The server sends them as `{ min, max }`; the user types them back as
// the same short notation. These helpers move between the two — display strings
// for read views, editable seeds for the builders, and the single value the
// "mark done" prefill starts from.

import { kgTo, type Units } from './units'

/** A planned target's two bounds, as the API returns them. */
export interface RangeValue {
    min: number
    max: number
}

/** Drop the float noise unit conversion leaves behind (224.9996 → "225"). */
export function displayNumber(value: number): string {
    return String(Math.round(value * 100) / 100)
}

/**
 * Format a range as `5` / `5-8`, applying `format` to each bound. Coinciding
 * bounds collapse to a single value — a plan of one number never shows as `5-5`.
 * `null` yields `empty` ("" for an editable seed, "—" for a read view).
 */
export function formatRange(
    range: RangeValue | null | undefined,
    {
        format = (value: number) => String(value),
        empty = '',
    }: { format?: (value: number) => string; empty?: string } = {},
): string {
    if (!range) return empty

    const min = format(range.min)
    const max = format(range.max)

    return min === max ? min : `${min}-${max}`
}

/** A weight range formatted in the user's display unit (both bounds converted). */
export function formatWeightRange(range: RangeValue | null | undefined, units: Units, empty = ''): string {
    return formatRange(range, { format: (kg) => displayNumber(kgTo(units, kg)), empty })
}

/**
 * The floor of a range — what a deviation is measured from and what the
 * "mark done" prefill starts at: a plan of `5-8` asks for 5 and offers 8, so 5
 * is the number to beat. `null` for an absent target.
 */
export function rangeMin(range: RangeValue | null | undefined): number | null {
    return range?.min ?? null
}
