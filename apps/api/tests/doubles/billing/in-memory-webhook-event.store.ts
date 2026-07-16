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
 *
 * The payload goes through a JSON round-trip **on purpose**: the real journal is a
 * JSONB column, so what comes back out has strings where the event had `Date`s.
 * Keeping the live object here made every replay test pass against a journal that
 * does not exist, and the `.toISOString()` that blew up in production was invisible.
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
            payload: JSON.parse(JSON.stringify(input.payload)) as unknown,
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

    async findByGatewayEvent(gateway: PaymentGateway, eventId: string): Promise<WebhookEventRecord | null> {
        return this.byKey.get(`${gateway}:${eventId}`) ?? null
    }

    async findFailedInvoiceEvents(
        gateway: PaymentGateway,
        gatewaySubscriptionId: string,
    ): Promise<WebhookEventRecord[]> {
        return [...this.byKey.values()].filter((record) => {
            const payload = record.payload as { kind?: string; gatewaySubscriptionId?: string | null }

            return (
                record.gateway === gateway &&
                record.status === 'failed' &&
                payload.kind === 'invoice' &&
                payload.gatewaySubscriptionId === gatewaySubscriptionId
            )
        })
    }

    all(): WebhookEventRecord[] {
        return [...this.byKey.values()]
    }
}
