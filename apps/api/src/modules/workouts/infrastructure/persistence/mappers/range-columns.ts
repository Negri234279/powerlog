/**
 * Rehydrate a planned range from the `_min`/`_max` column pair. Both are NULL
 * when nothing was planned. A NULL `_max` beside a present `_min` is read as a
 * single value rather than an error — that is what every row looked like before
 * ranges existed, so this degrades to the old meaning instead of blowing up.
 */
export function rangeFromColumns<R>(
    min: number | null,
    max: number | null,
    create: (min: number, max: number) => R,
): R | null {
    if (min === null) {
        return null
    }

    return create(min, max ?? min)
}
