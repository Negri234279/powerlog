/**
 * The bits of configuration billing needs, behind a port so the handlers never
 * read env (the repo's rule) and tests never have to set one.
 */
export abstract class BillingConfig {
    /** Where the browser comes back to after paying, cancelling or the portal. */
    abstract get webOrigin(): string

    /** The API's own public base URL — used to build the receipt-PDF link for
     *  invoices a gateway issues no document for (PayPal). No trailing slash. */
    abstract get apiPublicUrl(): string
}
