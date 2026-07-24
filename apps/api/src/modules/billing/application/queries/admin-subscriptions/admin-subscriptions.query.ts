import type { PaymentGateway } from '../../../domain/entities/subscription.entity'
import type { SubscriptionStatus } from '../../../domain/subscription-status'

export class AdminSubscriptionsQuery {
    constructor(
        readonly filter: {
            statuses?: SubscriptionStatus[]
            gateways?: PaymentGateway[]
            planId?: string
            /** Exact email or handle of the subscriber (resolved to a userId). */
            search?: string
        },
        readonly limit: number,
        readonly offset: number,
    ) {}
}
