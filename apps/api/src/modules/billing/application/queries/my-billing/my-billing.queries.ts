import type { PlanAudience } from '../../../../../shared/contracts/entitlements'
import type { SupportedLocale } from '../../../../../shared/i18n/locale'

/** The plans a user can actually buy, for the pricing page. Public. */
export class AvailablePlansQuery {
    constructor(
        readonly audience: PlanAudience,
        /** Which language to show name/description in; falls back to the base. */
        readonly locale: SupportedLocale,
    ) {}
}

/** The user's own subscription (null when they are on the free plan). */
export class MySubscriptionQuery {
    constructor(readonly userId: string) {}
}

/** The user's mirrored invoices, newest first. */
export class MyInvoicesQuery {
    constructor(
        readonly userId: string,
        readonly limit: number,
        readonly offset: number,
    ) {}
}

/** A URL to the gateway's own billing portal, or null if it has none. */
export class BillingPortalUrlQuery {
    constructor(readonly userId: string) {}
}
