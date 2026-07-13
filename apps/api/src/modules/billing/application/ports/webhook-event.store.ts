import type { PaymentGateway } from '../../domain/entities/subscription.entity'

export type WebhookEventStatus = 'received' | 'processed' | 'failed'

export interface WebhookEventRecord {
    id: string
    gateway: PaymentGateway
    eventId: string
    type: string
    status: WebhookEventStatus
    error: string | null
    receivedAt: Date
    processedAt: Date | null
    /** The raw event, kept so a failed one can be re-processed. */
    payload: unknown
}

/**
 * The webhook journal — what makes the pipeline idempotent and replayable.
 *
 * `record` is the gate: it returns false when this (gateway, eventId) has already
 * been seen, and the handler stops there. Providers retry aggressively, and a
 * retried activation must not become a second subscription.
 */
export abstract class WebhookEventStore {
    /**
     * Write the event down. Returns **false if it was already recorded** — the
     * caller must then treat it as a duplicate and do nothing.
     */
    abstract record(input: {
        gateway: PaymentGateway
        eventId: string
        type: string
        payload: unknown
    }): Promise<boolean>

    abstract markProcessed(gateway: PaymentGateway, eventId: string, at: Date): Promise<void>

    abstract markFailed(gateway: PaymentGateway, eventId: string, error: string): Promise<void>

    /**
     * Delete the journal row so the event can be handled again. Only a **replay** of
     * a failed one does this: the row is what makes a provider's retry a no-op, so
     * removing it is exactly how a human says "no, do try that one again".
     */
    abstract reopen(gateway: PaymentGateway, eventId: string): Promise<void>

    /** For the admin panel: what came in, and what failed. */
    abstract list(
        filter: { status?: WebhookEventStatus; gateway?: PaymentGateway },
        page: { limit: number; offset: number },
    ): Promise<{ rows: WebhookEventRecord[]; total: number }>

    abstract findById(id: string): Promise<WebhookEventRecord | null>
}
