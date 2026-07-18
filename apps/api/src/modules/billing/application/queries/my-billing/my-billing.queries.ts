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

/** The user's own subscription in an audience (null when they are on that free
 *  plan). Athlete and coach plans are independent, so the audience picks which. */
export class MySubscriptionQuery {
    constructor(
        readonly userId: string,
        readonly audience: PlanAudience,
    ) {}
}

/** The user's mirrored invoices, newest first. */
export class MyInvoicesQuery {
    constructor(
        readonly userId: string,
        readonly limit: number,
        readonly offset: number,
    ) {}
}

/** A URL to the gateway's own billing portal for the subscription in an audience,
 *  or null if there is none (free/manual, or a gateway with no portal like PayPal). */
export class BillingPortalUrlQuery {
    constructor(
        readonly userId: string,
        readonly audience: PlanAudience,
    ) {}
}
