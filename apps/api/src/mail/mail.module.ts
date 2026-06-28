import { Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { getToken } from '@willsoto/nestjs-prometheus'
import type { Counter } from 'prom-client'

import type { Env } from '../config/env'
import { METRIC } from '../observability/metrics'
import { Mailer } from './mailer.port'
import { MeteredMailer } from './metered.mailer'
import { ResendMailer } from './resend.mailer'
import { SmtpMailer } from './smtp.mailer'

/**
 * Provides the `Mailer` transport, chosen by `MAIL_TRANSPORT` (smtp → Mailpit in
 * dev; resend in prod). Global so any feature module can inject `Mailer` without
 * importing this module. Lives outside `src/modules` (shared kernel).
 */
@Global()
@Module({
    providers: [
        {
            provide: Mailer,
            inject: [ConfigService, getToken(METRIC.emailsSent)],
            useFactory: (config: ConfigService<Env, true>, emailsSent: Counter<string>): Mailer => {
                const transport =
                    config.get('MAIL_TRANSPORT', { infer: true }) === 'resend'
                        ? new ResendMailer(config)
                        : new SmtpMailer(config)

                return new MeteredMailer(transport, emailsSent)
            },
        },
    ],
    exports: [Mailer],
})
export class MailModule {}
