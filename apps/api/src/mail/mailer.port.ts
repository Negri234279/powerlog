/** A transactional email to send. The `from` address is owned by the adapter. */
export interface EmailMessage {
    to: string
    subject: string
    html: string
    text?: string
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
    abstract send(message: EmailMessage): Promise<void>
}
