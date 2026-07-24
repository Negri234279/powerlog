import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import type { PaymentGateway } from '../../../domain/entities/subscription.entity'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import { GatewayProvider } from '../../ports/gateway-provider.port'
import type { WebhookEventRecord, WebhookEventStatus } from '../../ports/webhook-event.store'
import { WebhookEventStore } from '../../ports/webhook-event.store'
import { ReconcileSubscriptions } from '../../services/reconcile-subscriptions.service'
import { AdminBillingDriftQuery, AdminGatewayStatusQuery, AdminWebhookEventsQuery } from './admin-gateways.queries'
import type { GatewayDrift } from '../../services/reconcile-subscriptions.service'

/** The health of one payment integration, as an operator needs to see it. */
export interface GatewayStatusView {
    gateway: PaymentGateway
    /** Does this deployment have keys for it at all? */
    configured: boolean
    /** Plans of the catalog that have been published to it. */
    syncedPlans: number
    totalPlans: number
    /**
     * The most useful signal there is, and the cheapest: **a long silence means the
     * endpoint is broken.** Providers send events constantly; nothing arriving is
     * not calm, it is deaf.
     */
    lastWebhookAt: Date | null
    failedWebhooks: number
}

export interface AdminWebhookEventView {
    id: string
    gateway: PaymentGateway
    eventId: string
    type: string
    status: WebhookEventStatus
    error: string | null
    receivedAt: Date
    processedAt: Date | null
}

@QueryHandler(AdminGatewayStatusQuery)
export class AdminGatewayStatusHandler implements IQueryHandler<AdminGatewayStatusQuery, GatewayStatusView[]> {
    constructor(
        private readonly gateways: GatewayProvider,
        private readonly plans: PlanRepository,
        private readonly events: WebhookEventStore,
    ) {}

    async execute(): Promise<GatewayStatusView[]> {
        const configured = new Set(this.gateways.available().map((gateway) => gateway.name))
        const plans = (await this.plans.findAll()).filter((plan) => !plan.isFree && plan.status === 'active')

        const statuses: GatewayStatusView[] = []
        for (const gateway of ['stripe', 'paypal'] as const) {
            const recent = await this.events.list({ gateways: [gateway] }, { limit: 1, offset: 0 })
            const failed = await this.events.list(
                { gateways: [gateway], statuses: ['failed'] },
                { limit: 1, offset: 0 },
            )

            statuses.push({
                gateway,
                configured: configured.has(gateway),
                syncedPlans: plans.filter((plan) => plan.productIdOn(gateway) !== null).length,
                totalPlans: plans.length,
                lastWebhookAt: recent.rows[0]?.receivedAt ?? null,
                failedWebhooks: failed.total,
            })
        }

        return statuses
    }
}

@QueryHandler(AdminWebhookEventsQuery)
export class AdminWebhookEventsHandler implements IQueryHandler<
    AdminWebhookEventsQuery,
    { rows: AdminWebhookEventView[]; total: number }
> {
    constructor(private readonly events: WebhookEventStore) {}

    async execute(query: AdminWebhookEventsQuery): Promise<{ rows: AdminWebhookEventView[]; total: number }> {
        const page = await this.events.list(
            {
                statuses: query.statuses,
                gateways: query.gateways,
                type: query.type,
                eventId: query.eventId,
            },
            { limit: query.limit, offset: query.offset },
        )

        return { rows: page.rows.map(toView), total: page.total }
    }
}

function toView(record: WebhookEventRecord): AdminWebhookEventView {
    return {
        id: record.id,
        gateway: record.gateway,
        eventId: record.eventId,
        type: record.type,
        status: record.status,
        error: record.error,
        receivedAt: record.receivedAt,
        processedAt: record.processedAt,
    }
}

/** Runs the reconciliation on demand — the panel's "check now", so a fix can be
 *  confirmed instead of waiting an hour for the probe. */
@QueryHandler(AdminBillingDriftQuery)
export class AdminBillingDriftHandler implements IQueryHandler<AdminBillingDriftQuery, GatewayDrift[]> {
    constructor(private readonly reconcile: ReconcileSubscriptions) {}

    execute(): Promise<GatewayDrift[]> {
        return this.reconcile.run()
    }
}
