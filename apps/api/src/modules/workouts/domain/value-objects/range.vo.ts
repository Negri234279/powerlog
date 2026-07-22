import { ValueObject } from '../../../../shared/domain/value-object'
import { MalformedRangeError, ReversedRangeError } from '../errors/workouts.errors'

/** The two bounds of a range. A single value is the degenerate `min === max`. */
export interface Bounds<V extends ValueObject<number>> {
    min: V
    max: V
}

/** `5` → `{ min: 5, max: 5 }` · `5-8` → `{ min: 5, max: 8 }` */
const SINGLE = /^\d+(?:[.,]\d+)?$/
const RANGE = /^(\d+(?:[.,]\d+)?)\s*-\s*(\d+(?:[.,]\d+)?)$/

/**
 * Parse the planned-value notation into raw bounds: either a number (`52.5`) or
 * two joined by a hyphen (`50-55`). A comma is accepted as the decimal separator,
 * since that is what a Spanish keyboard produces. Negatives are unrepresentable
 * by design — no planned value is negative, and a leading `-` would be
 * ambiguous against the separator.
 */
export function parseRangeText(text: string): { min: number; max: number } {
    const trimmed = text.trim()

    if (SINGLE.test(trimmed)) {
        const value = toNumber(trimmed)

        return {
            min: value,
            max: value,
        }
    }

    const match = RANGE.exec(trimmed)
    if (!match) {
        throw new MalformedRangeError()
    }

    return {
        min: toNumber(match[1]!),
        max: toNumber(match[2]!),
    }
}

function toNumber(raw: string): number {
    return Number(raw.replace(',', '.'))
}

/**
 * `RangeVO` — a planned target expressed as a closed range between two scalar
 * VOs of the same kind. Each bound validates itself (so `RepsRangeVO` inherits
 * the 1–1000 rule from `RepsVO`); the range only adds `min <= max`.
 *
 * Planned values are ranges; performed ones never are — you lifted what you
 * lifted. A plan of a single number is a range whose bounds coincide, so the
 * rest of the domain has one shape to handle rather than two.
 */
export abstract class RangeVO<V extends ValueObject<number>> extends ValueObject<Bounds<V>> {
    get min(): V {
        return this.value.min
    }

    get max(): V {
        return this.value.max
    }

    /** True when the range is a single point (`5`), not a span (`5-8`). */
    get isSingle(): boolean {
        return this.value.min.value === this.value.max.value
    }

    override equals(other: RangeVO<V>): boolean {
        return this.value.min.value === other.value.min.value && this.value.max.value === other.value.max.value
    }

    protected override assertIsValid(value: Bounds<V>): void {
        if (value.min.value > value.max.value) {
            throw new ReversedRangeError()
        }
    }
}
