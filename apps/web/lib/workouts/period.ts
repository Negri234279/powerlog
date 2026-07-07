/**
 * Period navigator maths for the workouts history view. Pure and locale-agnostic
 * except for the label formatter. Windows are computed in the user's *local*
 * calendar and emitted as `YYYY-MM-DD` bounds — the same shape the manual date
 * filter produces — so the page turns both into whole-day UTC bounds uniformly.
 *
 * Weeks start on Monday. Month blocks (`3m`/`6m`) are whole calendar months
 * aligned so the current block ends on the current month.
 */

export type PeriodMode = 'week' | 'month' | '3m' | '6m' | 'all' | 'custom'

/** Order shown in the segmented "mini grid" (`custom` is the manual escape hatch). */
export const PERIOD_MODES: readonly PeriodMode[] = ['week', 'month', '3m', '6m', 'all', 'custom']

export interface PeriodRange {
    /** Inclusive start, `YYYY-MM-DD` (local calendar). */
    from: string
    /** Inclusive end, `YYYY-MM-DD` (local calendar). */
    to: string
}

/** Local-calendar `YYYY-MM-DD` (no timezone shift). */
function toIsoDate(d: Date): string {
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${month}-${day}`
}

/** Parse a local `YYYY-MM-DD` back to a local midnight Date (for formatting). */
function fromIsoDate(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

/** Monday-based start of the week containing `d` (local). */
function startOfWeek(d: Date): Date {
    const r = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const mondayIndex = (r.getDay() + 6) % 7 // Mon=0 … Sun=6
    r.setDate(r.getDate() - mondayIndex)
    return r
}

/** Number of whole calendar months a month-based block spans. */
function monthsPerBlock(mode: PeriodMode): number {
    return mode === 'month' ? 1 : mode === '3m' ? 3 : 6
}

/**
 * The date window for a mode at a navigation `offset` (0 = current period, -1 =
 * previous, +1 = next). Returns `null` for `all` (unbounded). `now` is injectable
 * for tests.
 */
export function computeRange(mode: PeriodMode, offset: number, now: Date = new Date()): PeriodRange | null {
    // `all` is unbounded; `custom` is driven by the user's own from/to, not `now`.
    if (mode === 'all' || mode === 'custom') return null

    if (mode === 'week') {
        const start = startOfWeek(now)
        start.setDate(start.getDate() + offset * 7)
        const end = new Date(start)
        end.setDate(end.getDate() + 6)
        return { from: toIsoDate(start), to: toIsoDate(end) }
    }

    // Month-based block. JS Date normalises out-of-range month indices, so
    // negative/overflowing months roll into the right year automatically.
    const span = monthsPerBlock(mode)
    const shift = offset * span
    const start = new Date(now.getFullYear(), now.getMonth() + shift - (span - 1), 1)
    // Day 0 of the month after the block's last month = that month's last day.
    const end = new Date(now.getFullYear(), now.getMonth() + shift + 1, 0)
    return { from: toIsoDate(start), to: toIsoDate(end) }
}

/**
 * Human label for a bounded range, e.g. `7–13 jul 2026`, `julio 2026`,
 * `may–jul 2026`. Never called for `all` (the caller shows a translated label).
 */
export function formatRange(mode: PeriodMode, range: PeriodRange, locale: string): string {
    const start = fromIsoDate(range.from)
    const end = fromIsoDate(range.to)
    const fmt = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString(locale, opts)
    const sameYear = start.getFullYear() === end.getFullYear()

    if (mode === 'month') return fmt(start, { month: 'long', year: 'numeric' })

    if (mode === 'week') {
        const sameMonth = sameYear && start.getMonth() === end.getMonth()
        if (sameMonth) {
            // "7–13 jul 2026"
            return `${start.getDate()}–${fmt(end, { day: 'numeric', month: 'short', year: 'numeric' })}`
        }
        // "28 jul – 3 ago 2026" (drop the start year unless it differs)
        const startOpts: Intl.DateTimeFormatOptions = sameYear
            ? { day: 'numeric', month: 'short' }
            : { day: 'numeric', month: 'short', year: 'numeric' }
        return `${fmt(start, startOpts)} – ${fmt(end, { day: 'numeric', month: 'short', year: 'numeric' })}`
    }

    // 3m / 6m — month range: "may–jul 2026" or "nov 2025 – abr 2026"
    const startOpts: Intl.DateTimeFormatOptions = sameYear ? { month: 'short' } : { month: 'short', year: 'numeric' }
    return `${fmt(start, startOpts)}–${fmt(end, { month: 'short', year: 'numeric' })}`
}

/** A single `YYYY-MM-DD` as a short localized day, e.g. `7 jul 2026`. */
export function formatDay(iso: string, locale: string): string {
    return fromIsoDate(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}
