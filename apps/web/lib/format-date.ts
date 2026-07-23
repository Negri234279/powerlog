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

/**
 * A numeric date and time with **2-digit day and month** and a 4-digit year — e.g.
 * `18/07/2026, 14:30`, not `18/7/2026, 14:30`. The locale still decides field order
 * and separators (so `en` renders `07/18/2026, 14:30`); only the zero-padding is forced.

 */
export function formatNumericDateTime(iso: string, locale: string): string {
    return new Date(iso).toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}


/**
 * A session's date, the way a lifter reads one: `Fri, 3 Oct` — with the year
 * appended only when it isn't the current one.
 *
 * Both halves matter. Histories run for years, so a date without a year makes an
 * October two years ago indistinguishable from this October; but stamping the
 * year on every row of a list that is almost entirely this year is noise on the
 * scanning path. Showing it exactly when it disambiguates gets both.
 */
export function formatSessionDate(iso: string, locale: string): string {
    const date = new Date(iso)
    const options: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }

    if (date.getFullYear() !== new Date().getFullYear()) {
        options.year = 'numeric'
    }

    return date.toLocaleDateString(locale, options)
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
