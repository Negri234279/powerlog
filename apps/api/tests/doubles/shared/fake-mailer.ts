import { type EmailMessage, Mailer } from '../../../src/mail/mailer.port'

/** Records sent emails so tests can assert recipients/content (and extract links). */
export class FakeMailer extends Mailer {
    readonly sent: EmailMessage[] = []

    async send(message: EmailMessage): Promise<void> {
        this.sent.push(message)
    }

    last(): EmailMessage | undefined {
        return this.sent.at(-1)
    }
}
