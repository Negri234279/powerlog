/** Billing period. Mapped to each gateway's own interval unit + count on sync. */
export type PlanInterval = 'month' | 'quarter' | 'semester' | 'year'

/** Supported currencies. The user picks; the default follows their locale. */
export type Currency = 'EUR' | 'USD'

/** How many months one billing period spans. */
const MONTHS: Record<PlanInterval, number> = {
    month: 1,
    quarter: 3,
    semester: 6,
    year: 12,
}

/**
 * A price's contribution to MRR: what it bills, spread over the months it covers.
 * A yearly plan is not twelve times more revenue than a monthly one — this is the
 * normalisation that makes plans on different intervals comparable.
 */
export function monthlyAmountCents(amountCents: number, interval: PlanInterval): number {
    return amountCents / MONTHS[interval]
}

export function monthsIn(interval: PlanInterval): number {
    return MONTHS[interval]
}
