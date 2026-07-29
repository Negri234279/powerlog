import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

/**
 * `push_subscriptions` — one row per browser Web Push subscription. A user has N
 * rows (one per device/browser they opted in on). `user_id` is a SOFT reference
 * to the auth `users` (no cross-module FK): this is transversal transport, like
 * `user_presence`, so `auth` never has to know about push.
 *
 * `endpoint` is the push service URL the browser handed us; it is UNIQUE because
 * it identifies the subscription globally. On the same browser it survives across
 * app users (the PushManager is per-origin), so a re-register upserts by endpoint
 * and reassigns it to whoever is signed in now. `p256dh`/`auth` are the client
 * keys `web-push` encrypts the payload with. `locale` is stored so the sender can
 * localise the notification text without another lookup. A subscription the push
 * service reports as gone (404/410) is deleted at send time.
 */
export const pushSubscriptions = pgTable(
    'push_subscriptions',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id').notNull(),
        endpoint: text('endpoint').notNull(),
        p256dh: text('p256dh').notNull(),
        auth: text('auth').notNull(),
        locale: text('locale').notNull().default('en'),
        userAgent: text('user_agent'),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (t) => [
        uniqueIndex('push_subscriptions_endpoint_key').on(t.endpoint),
        index('push_subscriptions_user_id_idx').on(t.userId),
    ],
)
