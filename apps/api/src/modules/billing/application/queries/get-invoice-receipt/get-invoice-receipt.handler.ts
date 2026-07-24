import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { UserDirectory } from '../../../../../shared/contracts/user-directory'
import type { InvoiceEntity } from '../../../domain/entities/invoice.entity'
import type { PaymentGateway } from '../../../domain/entities/subscription.entity'
import { InvoiceRepository } from '../../../domain/repositories/invoice.repository'
import { PlanRepository } from '../../../domain/repositories/plan.repository'
import { SubscriptionRepository } from '../../../domain/repositories/subscription.repository'
import { ReceiptRenderer } from '../../ports/receipt-renderer.port'
import { GetInvoiceReceiptQuery } from './get-invoice-receipt.query'

/** The rendered receipt, ready for the controller to stream. */
export interface InvoiceReceipt {
    filename: string
    bytes: Buffer
}

const GATEWAY_LABEL: Record<PaymentGateway, string> = {
    stripe: 'Stripe',
    paypal: 'PayPal',
    manual: 'a manual grant',
}

/**
 * Builds the receipt for an invoice the caller owns — **our** document, from what
 * we mirrored, so an invoice a gateway issued no PDF for (PayPal) still has one.
 *
 * Returns null rather than throwing when the invoice is missing or belongs to
 * someone else: the controller turns that into a 404, and an attacker guessing ids
 * cannot tell "not yours" from "not there".
 */
@QueryHandler(GetInvoiceReceiptQuery)
export class GetInvoiceReceiptHandler implements IQueryHandler<GetInvoiceReceiptQuery, InvoiceReceipt | null> {
    constructor(
        private readonly invoices: InvoiceRepository,
        private readonly subscriptions: SubscriptionRepository,
        private readonly plans: PlanRepository,
        private readonly users: UserDirectory,
        private readonly renderer: ReceiptRenderer,
    ) {}

    async execute(query: GetInvoiceReceiptQuery): Promise<InvoiceReceipt | null> {
        const invoice = await this.invoices.findById(query.invoiceId)
        if (!invoice || invoice.userId !== query.userId) return null

        const number = invoice.number ?? this.receiptNumber(invoice)
        const contact = await this.users.getContact(invoice.userId)
        const name = [contact?.firstName, contact?.lastName].filter(Boolean).join(' ') || null

        const bytes = await this.renderer.render({
            number,
            issuedAt: invoice.issuedAt,
            paidAt: invoice.paidAt,
            billedTo: { name, email: contact?.email ?? '' },
            description: await this.describe(invoice),
            // A paid invoice records what was actually taken; an open one, what is owed.
            amountCents: invoice.status === 'paid' ? invoice.amountPaidCents : invoice.amountDueCents,
            currency: invoice.currency,
            paidVia: GATEWAY_LABEL[invoice.gateway],
        })

        return { filename: `powerlog-receipt-${number}.pdf`, bytes }
    }

    /** The plan the invoice paid for, as the receipt's single line. */
    private async describe(invoice: InvoiceEntity): Promise<string> {
        if (!invoice.subscriptionId) return 'Subscription'

        const subscription = await this.subscriptions.findById(invoice.subscriptionId)
        if (!subscription) return 'Subscription'

        const plan = await this.plans.findById(subscription.planId)

        return plan ? `${plan.name} plan` : 'Subscription'
    }

    /** A stable, human-ish number derived from the invoice id, since PayPal gives none. */
    private receiptNumber(invoice: InvoiceEntity): string {
        const year = invoice.issuedAt.getUTCFullYear()

        return `PL-${year}-${invoice.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
    }
}
