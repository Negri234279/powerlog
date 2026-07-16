/**
 * The receipt PDF for one of the caller's invoices. `userId` is not a filter for
 * convenience — it is the authorization: a receipt is only ever the buyer's own.
 */
export class GetInvoiceReceiptQuery {
    constructor(
        readonly userId: string,
        readonly invoiceId: string,
    ) {}
}
