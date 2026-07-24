import type { PaymentGateway } from '../../domain/entities/subscription.entity'

/**
 * Schedules a second (third, …) attempt at a webhook whose handler failed, with
 * backoff, so a transient fault — a database blip, a gateway call that timed out
 * mid-handling, or simply an event that landed before the row it needs — heals
 * itself instead of waiting for a human to replay it from the admin panel.
 *
 * The invoice-before-subscription race is already fixed deterministically when the
 * subscription is created (see `HandleGatewayEventHandler.redriveFailedInvoices`);
 * this is the general safety net for everything else.
 *
 * **Optional, like everything Redis-backed here.** With `REDIS_URL` set it is
 * BullMQ (durable, cross-instance, exponential backoff); without it, an in-process
 * timer within this replica. Either way the retry runs the same pipeline the live
 * webhook does, and stops once the event is `processed` or the attempts run out.
 */
export abstract class WebhookRetryQueue {
    /**
     * Ask for a failed event to be retried. Idempotent per `(gateway, eventId)`:
     * enqueuing one that is already waiting is a no-op, so the gateway resending the
     * webhook (or two replicas failing the same event) cannot pile up retries.
     *
     * Best-effort: a scheduling failure must never mask the original error that put
     * the event on the journal, so callers swallow what this throws.
     */
    abstract enqueue(gateway: PaymentGateway, eventId: string): Promise<void>
}
