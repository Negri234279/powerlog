import {
    type PaymentGateway,
    SubscriptionAggregate,
} from '../../../src/modules/billing/domain/entities/subscription.entity'
import type { SubscriptionStatus } from '../../../src/modules/billing/domain/subscription-status'

const PERIOD_START = new Date('2026-07-01T00:00:00.000Z')
const PERIOD_END = new Date('2026-08-01T00:00:00.000Z')

export const SubscriptionMother = {
    create(
        overrides: Partial<{
            id: string
            userId: string
            planId: string
            planPriceId: string | null
            gateway: PaymentGateway
            gatewaySubscriptionId: string | null
            gatewayCustomerId: string | null
            status: SubscriptionStatus
            currentPeriodStart: Date
            currentPeriodEnd: Date
        }> = {},
    ): SubscriptionAggregate {
        return SubscriptionAggregate.create({
            id: overrides.id ?? 'sub-1',
            userId: overrides.userId ?? 'u-1',
            planId: overrides.planId ?? 'plan-athlete-pro',
            planPriceId: overrides.planPriceId ?? null,
            gateway: overrides.gateway ?? 'stripe',
            gatewaySubscriptionId: overrides.gatewaySubscriptionId ?? null,
            gatewayCustomerId: overrides.gatewayCustomerId ?? null,
            status: overrides.status ?? 'active',
            currentPeriodStart: overrides.currentPeriodStart ?? PERIOD_START,
            currentPeriodEnd: overrides.currentPeriodEnd ?? PERIOD_END,
            now: PERIOD_START,
        })
    },
}
