import type { PaymentGateway } from '../../../domain/entities/subscription.entity'
import { SubscriptionAggregate } from '../../../domain/entities/subscription.entity'
import type { SubscriptionStatus } from '../../../domain/subscription-status'
import type { subscriptions } from '../schema/subscriptions.schema'

type SubscriptionRow = typeof subscriptions.$inferSelect
type SubscriptionInsert = typeof subscriptions.$inferInsert

export function toSubscriptionAggregate(row: SubscriptionRow): SubscriptionAggregate {
    return SubscriptionAggregate.rehydrate({
        id: row.id,
        userId: row.userId,
        planId: row.planId,
        planPriceId: row.planPriceId,
        gateway: row.gateway as PaymentGateway,
        gatewayCustomerId: row.gatewayCustomerId,
        gatewaySubscriptionId: row.gatewaySubscriptionId,
        status: row.status as SubscriptionStatus,
        currentPeriodStart: row.currentPeriodStart,
        currentPeriodEnd: row.currentPeriodEnd,
        cancelAtPeriodEnd: row.cancelAtPeriodEnd,
        canceledAt: row.canceledAt,
        pendingPlanPriceId: row.pendingPlanPriceId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    })
}

export function toSubscriptionRow(subscription: SubscriptionAggregate): SubscriptionInsert {
    return {
        id: subscription.id,
        userId: subscription.userId,
        planId: subscription.planId,
        planPriceId: subscription.planPriceId,
        gateway: subscription.gateway,
        gatewayCustomerId: subscription.gatewayCustomerId,
        gatewaySubscriptionId: subscription.gatewaySubscriptionId,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt,
        pendingPlanPriceId: subscription.pendingPlanPriceId,
        createdAt: subscription.createdAt,
        updatedAt: subscription.updatedAt,
    }
}
