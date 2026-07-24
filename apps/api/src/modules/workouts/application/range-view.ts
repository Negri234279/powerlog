import type { ValueObject } from '../../../shared/domain/value-object'
import type { RangeVO } from '../domain/value-objects/range.vo'

/**
 * A planned target on its way out to presentation: the two bounds of its range.
 * Equal bounds mean a single value (`5`), which is how every target read before
 * ranges existed — the client formats the pair, so `5-5` never reaches a screen.
 */
export interface RangeView {
    min: number
    max: number
}

export function toRangeView<V extends ValueObject<number>>(range: RangeVO<V> | null): RangeView | null {
    if (!range) {
        return null
    }

    return {
        min: range.min.value,
        max: range.max.value,
    }
}
