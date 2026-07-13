import type { Currency } from '../plan-interval'
import type { PaymentGateway } from './subscription.entity'

/** What the gateway says became of the charge. */
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'uncollectible' | 'void'

export interface InvoiceProps {
    id: string
    /** Soft reference to the auth user (no DB FK across modules). */
    userId: string
    subscriptionId: string | null
    gateway: PaymentGateway
    gatewayInvoiceId: string
    /** The gateway's own invoice number, when it issues one. */
    number: string | null
    status: InvoiceStatus
    amountDueCents: number
    amountPaidCents: number
    currency: Currency
    hostedUrl: string | null
    pdfUrl: string | null
    issuedAt: Date
    paidAt: Date | null
}

/**
 * `InvoiceEntity` — a **mirror** of an invoice the gateway issued. Flat entity, no
 * aggregate: we never compute an invoice, we copy one.
 *
 * The app does **zero tax or invoicing logic on purpose**: the provider is the one
 * that has to be right about VAT and legal numbering, and it already is. What is
 * stored is enough for the user to see their billing history and click through to
 * the real document.
 *
 * The asymmetry is accepted: Stripe issues a real invoice with a PDF; PayPal (9.4)
 * gives transactions and no PDF, so those mirror as paid invoices with no
 * `pdfUrl`. The billing page shows both the same way.
 */
export class InvoiceEntity {
    private constructor(private readonly props: InvoiceProps) {}

    static create(props: InvoiceProps): InvoiceEntity {
        return new InvoiceEntity(props)
    }

    static rehydrate(props: InvoiceProps): InvoiceEntity {
        return new InvoiceEntity(props)
    }

    get id(): string {
        return this.props.id
    }
    get userId(): string {
        return this.props.userId
    }
    get subscriptionId(): string | null {
        return this.props.subscriptionId
    }
    get gateway(): PaymentGateway {
        return this.props.gateway
    }
    get gatewayInvoiceId(): string {
        return this.props.gatewayInvoiceId
    }
    get number(): string | null {
        return this.props.number
    }
    get status(): InvoiceStatus {
        return this.props.status
    }
    get amountDueCents(): number {
        return this.props.amountDueCents
    }
    get amountPaidCents(): number {
        return this.props.amountPaidCents
    }
    get currency(): Currency {
        return this.props.currency
    }
    get hostedUrl(): string | null {
        return this.props.hostedUrl
    }
    get pdfUrl(): string | null {
        return this.props.pdfUrl
    }
    get issuedAt(): Date {
        return this.props.issuedAt
    }
    get paidAt(): Date | null {
        return this.props.paidAt
    }
}
