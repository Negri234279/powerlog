import { type EmailMessage, Mailer } from '../../../src/mail/mailer.port'

/** Records sent emails so tests can assert recipients/content (and extract links). */
export class FakeMailer extends Mailer {
    readonly sent: EmailMessage[] = []

    async send(message: EmailMessage): Promise<string | undefined> {
        this.sent.push(message)
        return undefined
    }

    last(): EmailMessage | undefined {
        return this.sent.at(-1)
    }
}
