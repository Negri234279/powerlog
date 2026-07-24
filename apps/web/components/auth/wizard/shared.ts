import type { PublicPlan, PublicPrice } from '@/lib/graphql/hooks/use-billing'

/** The wizard's linear flow. `payment` only runs when a paid plan was chosen. */
export type WizardStep = 'athlete' | 'coach' | 'account' | 'review' | 'payment'

export type Interval = 'month' | 'year'
export type Currency = 'EUR' | 'USD'

export const INTERVALS: readonly Interval[] = ['month', 'year']
export const CURRENCIES: readonly Currency[] = ['EUR', 'USD']

/** Localised currency, trimming the `,00` on whole amounts (7,99 € but 80 €). */
export function money(amountCents: number, currency: string, locale: string): string {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
    }).format(amountCents / 100)
}

/** The plan's price at a given interval/currency, or null when it isn't sold that way. */
export function priceOf(plan: PublicPlan, interval: Interval, currency: Currency): PublicPrice | null {
    return plan.prices.find((price) => price.interval === interval && price.currency === currency) ?? null
}

/**
 * The price a paid plan would be charged at, or null for a free plan (or one not
 * sold at this interval/currency). What the payment step needs to start a checkout.
 */
export function chargeablePrice(plan: PublicPlan | null, interval: Interval, currency: Currency): PublicPrice | null {
    if (!plan || plan.isFree) return null

    return priceOf(plan, interval, currency)
}

/**
 * Honest annual anchor: how much cheaper the yearly price is than paying monthly
 * for a year, as a rounded percent — or null when it can't be computed (missing a
 * price) or the year isn't actually cheaper. Compares REAL prices only.
 */
export function annualSavingsPct(plan: PublicPlan, currency: Currency): number | null {
    const month = priceOf(plan, 'month', currency)
    const year = priceOf(plan, 'year', currency)
    if (!month || !year || month.amountCents <= 0) return null

    const twelveMonths = month.amountCents * 12
    if (year.amountCents >= twelveMonths) return null

    return Math.round((1 - year.amountCents / twelveMonths) * 100)
}

/** Whole days until an ISO date, or null if it's absent, invalid, or already past. */
export function daysUntil(iso: string | null | undefined): number | null {
    if (!iso) return null

    const ms = new Date(iso).getTime() - Date.now()
    if (Number.isNaN(ms) || ms <= 0) return null

    return Math.max(1, Math.ceil(ms / 86_400_000))
}
