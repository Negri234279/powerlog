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
