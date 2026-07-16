import { Inject, Injectable } from '@nestjs/common'
import { and, count, desc, eq, sql } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import {
    type WebhookEventRecord,
    type WebhookEventStatus,
    WebhookEventStore,
} from '../../../application/ports/webhook-event.store'
import type { PaymentGateway } from '../../../domain/entities/subscription.entity'
import { billingWebhookEvents } from '../schema/billing-webhook-events.schema'

type EventRow = typeof billingWebhookEvents.$inferSelect

function toRecord(row: EventRow): WebhookEventRecord {
    return {
        id: row.id,
        gateway: row.gateway as PaymentGateway,
        eventId: row.eventId,
        type: row.type,
        status: row.status as WebhookEventStatus,
        error: row.error,
        receivedAt: row.receivedAt,
        processedAt: row.processedAt,
        payload: row.payload,
    }
}

@Injectable()
export class DrizzleWebhookEventStore extends WebhookEventStore {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async record(input: {
        gateway: PaymentGateway
        eventId: string
        type: string
        payload: unknown
    }): Promise<boolean> {
        // The insert IS the idempotency check: the unique (gateway, event_id) index
        // decides, so two replicas racing on the same retry cannot both win.
        const inserted = await this.db
            .insert(billingWebhookEvents)
            .values({
                gateway: input.gateway,
                eventId: input.eventId,
                type: input.type,
                payload: input.payload,
            })
            .onConflictDoNothing({ target: [billingWebhookEvents.gateway, billingWebhookEvents.eventId] })
            .returning({ id: billingWebhookEvents.id })

        return inserted.length > 0
    }

    async markProcessed(gateway: PaymentGateway, eventId: string, at: Date): Promise<void> {
        await this.db
            .update(billingWebhookEvents)
            .set({ status: 'processed', processedAt: at, error: null })
            .where(and(eq(billingWebhookEvents.gateway, gateway), eq(billingWebhookEvents.eventId, eventId)))
    }

    async markFailed(gateway: PaymentGateway, eventId: string, error: string): Promise<void> {
        await this.db
            .update(billingWebhookEvents)
            .set({ status: 'failed', error: error.slice(0, 500) })
            .where(and(eq(billingWebhookEvents.gateway, gateway), eq(billingWebhookEvents.eventId, eventId)))
    }

    async reopen(gateway: PaymentGateway, eventId: string): Promise<void> {
        await this.db
            .delete(billingWebhookEvents)
            .where(and(eq(billingWebhookEvents.gateway, gateway), eq(billingWebhookEvents.eventId, eventId)))
    }

    async list(
        filter: { status?: WebhookEventStatus; gateway?: PaymentGateway },
        page: { limit: number; offset: number },
    ): Promise<{ rows: WebhookEventRecord[]; total: number }> {
        const where = and(
            filter.status ? eq(billingWebhookEvents.status, filter.status) : undefined,
            filter.gateway ? eq(billingWebhookEvents.gateway, filter.gateway) : undefined,
        )

        const rows = await this.db
            .select()
            .from(billingWebhookEvents)
            .where(where)
            .orderBy(desc(billingWebhookEvents.receivedAt))
            .limit(page.limit)
            .offset(page.offset)

        const [total] = await this.db.select({ value: count() }).from(billingWebhookEvents).where(where)

        return { rows: rows.map(toRecord), total: Number(total?.value ?? 0) }
    }

    async findById(id: string): Promise<WebhookEventRecord | null> {
        const [row] = await this.db.select().from(billingWebhookEvents).where(eq(billingWebhookEvents.id, id)).limit(1)

        return row ? toRecord(row) : null
    }

    async findByGatewayEvent(gateway: PaymentGateway, eventId: string): Promise<WebhookEventRecord | null> {
        const [row] = await this.db
            .select()
            .from(billingWebhookEvents)
            .where(and(eq(billingWebhookEvents.gateway, gateway), eq(billingWebhookEvents.eventId, eventId)))
            .limit(1)

        return row ? toRecord(row) : null
    }

    async findFailedInvoiceEvents(
        gateway: PaymentGateway,
        gatewaySubscriptionId: string,
    ): Promise<WebhookEventRecord[]> {
        // The subscription id lives inside the normalized payload we journalled, so
        // the `->>` reaches into it. The `kind` guard keeps this to invoices even if a
        // future event type happens to carry the same field.
        const rows = await this.db
            .select()
            .from(billingWebhookEvents)
            .where(
                and(
                    eq(billingWebhookEvents.gateway, gateway),
                    eq(billingWebhookEvents.status, 'failed'),
                    sql`${billingWebhookEvents.payload}->>'kind' = 'invoice'`,
                    sql`${billingWebhookEvents.payload}->>'gatewaySubscriptionId' = ${gatewaySubscriptionId}`,
                ),
            )
            .orderBy(desc(billingWebhookEvents.receivedAt))

        return rows.map(toRecord)
    }
}
