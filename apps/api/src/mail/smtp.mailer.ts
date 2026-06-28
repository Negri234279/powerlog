import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createTransport, type Transporter } from 'nodemailer'

import type { Env } from '../config/env'
import { type EmailMessage, Mailer } from './mailer.port'

/** Dev/self-hosted transport: SMTP via Nodemailer (Mailpit in dev). */
@Injectable()
export class SmtpMailer extends Mailer {
    private readonly transporter: Transporter
    private readonly from: string

    constructor(config: ConfigService<Env, true>) {
        super()

        const user = config.get('SMTP_USER', { infer: true })
        const pass = config.get('SMTP_PASS', { infer: true })

        this.transporter = createTransport({
            host: config.get('SMTP_HOST', { infer: true }),
            port: config.get('SMTP_PORT', { infer: true }),
            secure: config.get('SMTP_SECURE', { infer: true }),
            auth: user ? { user, pass } : undefined,
        })

        this.from = config.get('MAIL_FROM', { infer: true })
    }

    async send(message: EmailMessage): Promise<void> {
        await this.transporter.sendMail({
            from: this.from,
            to: message.to,
            subject: message.subject,
            html: message.html,
            text: message.text,
        })
    }
}
