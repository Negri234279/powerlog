import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'

import type { Env } from '../config/env'
import { type EmailMessage, Mailer } from './mailer.port'

/** Production transport: Resend HTTP API. */
@Injectable()
export class ResendMailer extends Mailer {
    private readonly client: Resend
    private readonly from: string

    constructor(config: ConfigService<Env, true>) {
        super()

        this.client = new Resend(config.get('RESEND_API_KEY', { infer: true }))
        this.from = config.get('MAIL_FROM', { infer: true })
    }

    async send(message: EmailMessage): Promise<void> {
        const { error } = await this.client.emails.send({
            from: this.from,
            to: message.to,
            subject: message.subject,
            html: message.html,
            ...(message.text ? { text: message.text } : {}),
        })

        if (error) {
            throw new Error(`Resend failed to send email: ${error.message}`)
        }
    }
}
