/** Everything a receipt shows, already resolved — the renderer draws, it does not
 *  look anything up. Amounts are in minor units (cents), currency is ISO-4217. */
export interface ReceiptData {
    /** Our own human-readable number, since PayPal issues none. */
    number: string
    issuedAt: Date
    paidAt: Date | null
    /** Who it was billed to. `name` is null when the user never filled it in. */
    billedTo: { name: string | null; email: string }
    /** The one line: what they paid for (the plan) and the period it covers. */
    description: string
    amountCents: number
    currency: string
    /** How it was paid, for the footer ("Paid via PayPal"). */
    paidVia: string
}

/**
 * Renders a receipt to a PDF. Behind a port so the handler stays free of the PDF
 * library and tests never render bytes.
 *
 * This is **our** document, generated from what we stored — the answer to gateways
 * that hand back no invoice PDF of their own (PayPal). Stripe's own hosted PDF is
 * still preferred where it exists; this fills the gap.
 */
export abstract class ReceiptRenderer {
    abstract render(data: ReceiptData): Promise<Buffer>
}
