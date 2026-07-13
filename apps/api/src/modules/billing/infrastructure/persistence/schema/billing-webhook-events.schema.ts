import { index, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { paymentGatewayEnum } from './subscriptions.schema'

export const webhookEventStatusEnum = pgEnum('webhook_event_status', ['received', 'processed', 'failed'])

/**
 * `billing_webhook_events` — every signed event the providers sent us, and what
 * we did with it.
 *
 * It buys three things that are hard to get any other way:
 *  - **Idempotency.** Providers retry, and a retry must not charge, activate or
 *    cancel anything twice. The unique `(gateway, event_id)` is what makes a
 *    replay a no-op instead of a second activation.
 *  - **Replay.** A handler that crashed leaves the row `failed` with its payload,
 *    so it can be re-processed from the admin panel instead of being lost.
 *  - **An audit trail** of the channel every other billing number depends on.
 */
export const billingWebhookEvents = pgTable(
    'billing_webhook_events',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        gateway: paymentGatewayEnum('gateway').notNull(),
        /** The provider's own event id — the idempotency key. */
        eventId: text('event_id').notNull(),
        type: text('type').notNull(),
        payload: jsonb('payload').notNull(),
        status: webhookEventStatusEnum('status').notNull().default('received'),
        /** Why it failed, when it did. Read by whoever decides to retry it. */
        error: text('error'),
        receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
        processedAt: timestamp('processed_at', { withTimezone: true }),
    },
    (table) => [
        uniqueIndex('billing_webhook_events_gateway_event').on(table.gateway, table.eventId),
        // The admin panel's list: what failed, newest first.
        index('billing_webhook_events_status_received').on(table.status, table.receivedAt),
    ],
)
