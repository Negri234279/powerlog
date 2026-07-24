import type { PaymentGateway } from '../../../domain/entities/subscription.entity'

/** Publish a plan (and its live prices + offer) to a payment gateway. */
export class SyncPlanCommand {
    constructor(
        readonly planId: string,
        readonly gateway: PaymentGateway,
    ) {}
}
