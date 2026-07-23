/** A transactional email to send. The `from` address is owned by the adapter. */
export interface EmailMessage {
    to: string
    subject: string
    html: string
    text?: string
    /**
     * Reply-To address. Used by the contact/support flow so a reply from the admin
     * inbox goes back to the person who wrote in, not to the app's `from` address.
     */
    replyTo?: string
    /**
     * Low-cardinality purpose label (e.g. `email_verification`, `password_reset`)
     * used as the `type` label on the `emails_sent` metric. Never a recipient.
     */
    tag?: string
}

/**
 * Generic email transport. Lives outside `src/modules` so any module can send
 * mail without crossing a boundary. Adapters (Resend / SMTP) live beside it;
 * the concrete one is chosen by `MAIL_TRANSPORT`.
 */
export abstract class Mailer {
    /**
     * Sends the message and returns the provider's message id (Resend id /
     * SMTP Message-ID), or undefined if the transport doesn't expose one. The id
     * is logged on send so a dispatch line can be correlated with its later
     * delivery webhook event.
     */
    abstract send(message: EmailMessage): Promise<string | undefined>
}
