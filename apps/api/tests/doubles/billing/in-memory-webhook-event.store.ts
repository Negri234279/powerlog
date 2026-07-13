import {
    type WebhookEventRecord,
    type WebhookEventStatus,
    WebhookEventStore,
} from '../../../src/modules/billing/application/ports/webhook-event.store'
import type { PaymentGateway } from '../../../src/modules/billing/domain/entities/subscription.entity'

/**
 * In-memory webhook journal. `record` refuses a second write of the same
 * (gateway, eventId), exactly like the unique index does — which is the behaviour
 * the whole pipeline's idempotency rests on.
 */
export class InMemoryWebhookEventStore extends WebhookEventStore {
    private readonly byKey = new Map<string, WebhookEventRecord>()

    async record(input: {
        gateway: PaymentGateway
        eventId: string
        type: string
        payload: unknown
    }): Promise<boolean> {
        const key = `${input.gateway}:${input.eventId}`
        if (this.byKey.has(key)) return false

        this.byKey.set(key, {
            id: key,
            gateway: input.gateway,
            eventId: input.eventId,
            type: input.type,
            status: 'received',
            error: null,
            receivedAt: new Date(),
            processedAt: null,
            payload: input.payload,
        })

        return true
    }

    async markProcessed(gateway: PaymentGateway, eventId: string, at: Date): Promise<void> {
        const record = this.byKey.get(`${gateway}:${eventId}`)
        if (record) Object.assign(record, { status: 'processed', processedAt: at, error: null })
    }

    async markFailed(gateway: PaymentGateway, eventId: string, error: string): Promise<void> {
        const record = this.byKey.get(`${gateway}:${eventId}`)
        if (record) Object.assign(record, { status: 'failed', error })
    }

    async reopen(gateway: PaymentGateway, eventId: string): Promise<void> {
        this.byKey.delete(`${gateway}:${eventId}`)
    }

    async list(
        filter: { status?: WebhookEventStatus; gateway?: PaymentGateway },
        page: { limit: number; offset: number },
    ): Promise<{ rows: WebhookEventRecord[]; total: number }> {
        const all = [...this.byKey.values()].filter(
            (record) =>
                (!filter.status || record.status === filter.status) &&
                (!filter.gateway || record.gateway === filter.gateway),
        )

        return { rows: all.slice(page.offset, page.offset + page.limit), total: all.length }
    }

    async findById(id: string): Promise<WebhookEventRecord | null> {
        return this.byKey.get(id) ?? null
    }

    all(): WebhookEventRecord[] {
        return [...this.byKey.values()]
    }
}
