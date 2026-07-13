import { integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { currencyEnum } from './plan-prices.schema'
import { paymentGatewayEnum, subscriptions } from './subscriptions.schema'

export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'open', 'paid', 'uncollectible', 'void'])

/**
 * `invoices` — a **mirror** of what the gateway issued. We never compute an
 * invoice, and we do no tax logic: the provider has to be right about VAT and
 * legal numbering, and it is. This is what the user's billing page reads, and the
 * link back to the real document.
 *
 * `user_id` is a soft reference (no FK across modules), like everywhere else.
 * `subscription_id` is nullable: an invoice can arrive for a subscription we have
 * not mirrored yet (webhooks are not ordered), and dropping it would lose the
 * payment record.
 */
export const invoices = pgTable(
    'invoices',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        userId: uuid('user_id').notNull(),
        subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),
        gateway: paymentGatewayEnum('gateway').notNull(),
        gatewayInvoiceId: text('gateway_invoice_id').notNull(),
        number: text('number'),
        status: invoiceStatusEnum('status').notNull(),
        amountDueCents: integer('amount_due_cents').notNull(),
        amountPaidCents: integer('amount_paid_cents').notNull(),
        currency: currencyEnum('currency').notNull(),
        hostedUrl: text('hosted_url'),
        // Stripe issues a PDF; PayPal does not. The page shows both the same way.
        pdfUrl: text('pdf_url'),
        issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
        paidAt: timestamp('paid_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        // One row per invoice, per gateway. The webhook pipeline upserts on this:
        // an invoice that goes open → paid updates the same row.
        uniqueIndex('invoices_gateway_invoice').on(table.gateway, table.gatewayInvoiceId),
    ],
)
