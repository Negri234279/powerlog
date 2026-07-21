/**
 * A numeric date with **2-digit day and month** and a 4-digit year — e.g.
 * `18/07/2026`, not `18/7/2026`. The locale still decides field order and
 * separators (so `en` renders `07/18/2026`); only the zero-padding is forced.
 *
 * For the billing/plan surfaces where dates read as plain numbers. Day-and-month
 * spelled-out formats (`18 jul`) have their own options at their call sites.
 */
export function formatNumericDate(iso: string, locale: string): string {
    return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** Today as YYYY-MM-DD in the user's local timezone (for `<input type="date">`). */
export function todayLocalIso(): string {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    return `${now.getFullYear()}-${month}-${day}`
}

/**
 * A date input value → an ISO datetime at local midday. Sessions are dated at
 * noon so that a timezone shift either way can't move them to a different day.
 */
export function isoAtNoon(date: string): string {
    return new Date(`${date}T12:00:00`).toISOString()
}
