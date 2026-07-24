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

    async send(message: EmailMessage): Promise<string | undefined> {
        const { data, error } = await this.client.emails.send({
            from: this.from,
            to: message.to,
            subject: message.subject,
            html: message.html,
            ...(message.text ? { text: message.text } : {}),
            ...(message.replyTo ? { replyTo: message.replyTo } : {}),
            // Tag with the purpose so Resend echoes it on delivery webhooks → we
            // can break delivered/bounced/complained down by email type. Tag
            // values allow only [A-Za-z0-9_-], which our tags already satisfy.
            ...(message.tag ? { tags: [{ name: 'type', value: message.tag }] } : {}),
        })

        if (error) {
            // Keep Resend's status + name so the failure log is diagnosable, e.g.
            // a 403 "Domain not verified: Verify <domain> or update your from domain."
            const status = (error as { statusCode?: number }).statusCode
            const detail = status ? ` (${status} ${error.name})` : ` (${error.name})`
            throw new Error(`Resend send failed${detail}: ${error.message}`)
        }

        return data?.id
    }
}
