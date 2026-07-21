/**
 * One population split three ways: done, missed, still to come. A bar rather
 * than three numbers because the coach's question is about proportion — and
 * because it can't be mistaken for the independent meters in the other panel.
 *
 * Colour never carries meaning alone: the legend below states every segment in
 * words, and the whole bar is one labelled image to a screen reader.
 */
export function SegmentedBar({
    done,
    missed,
    upcoming,
    label,
}: {
    done: number
    missed: number
    upcoming: number
    /** The full sentence a screen reader gets in place of the bar. */
    label: string
}) {
    const total = done + missed + upcoming
    if (total === 0) return null

    const percent = (value: number) => `${(value / total) * 100}%`

    return (
        <div className="flex h-2 overflow-hidden rounded-full bg-white/[0.06]" role="img" aria-label={label}>
            <span className="bg-pr" style={{ width: percent(done) }} aria-hidden />
            <span className="bg-ember" style={{ width: percent(missed) }} aria-hidden />
            <span className="bg-white/20" style={{ width: percent(upcoming) }} aria-hidden />
        </div>
    )
}
