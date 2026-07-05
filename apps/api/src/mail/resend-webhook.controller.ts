import {
    Controller,
    Headers,
    HttpCode,
    Post,
    type RawBodyRequest,
    Req,
    ServiceUnavailableException,
    UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Request } from 'express'
import { PinoLogger } from 'nestjs-pino'
import type { Counter } from 'prom-client'

import type { Env } from '../config/env'
import { METRIC } from '../observability/metrics'
import { verifySvixSignature } from './svix-signature'

/** Minimal shape of a Resend (Svix) webhook event we read. */
interface ResendWebhookEvent {
    type?: string
    data?: {
        tags?: Array<{ name?: string; value?: string }> | Record<string, string>
    }
}

/** Reads the `type` tag we stamp on send (array or object form), for the metric. */
function emailType(event: ResendWebhookEvent): string {
    const tags = event.data?.tags

    if (Array.isArray(tags)) {
        return tags.find((t) => t.name === 'type')?.value ?? 'unknown'
    }

    if (tags && typeof tags === 'object') {
        return tags['type'] ?? 'unknown'
    }

    return 'unknown'
}

/**
 * Resend delivery webhook → `powerlog_email_events_total`. A sanctioned REST
 * endpoint (like the Google OAuth callback): webhooks can't be GraphQL. Public,
 * but authenticated by the Svix signature — verification needs the raw body, so
 * the app is bootstrapped with `rawBody: true`.
 */
@Controller('webhooks/resend')
export class ResendWebhookController {
    constructor(
        private readonly config: ConfigService<Env, true>,
        @InjectMetric(METRIC.emailEvents) private readonly emailEvents: Counter<string>,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(ResendWebhookController.name)
    }

    @Post()
    @HttpCode(200)
    handle(
        @Req() req: RawBodyRequest<Request>,
        @Headers('svix-id') id: string,
        @Headers('svix-timestamp') timestamp: string,
        @Headers('svix-signature') signature: string,
    ): void {
        const secret = this.config.get('RESEND_WEBHOOK_SECRET', { infer: true })
        if (!secret) {
            this.logger.warn('Resend webhook received but RESEND_WEBHOOK_SECRET is not set — rejecting')
            throw new ServiceUnavailableException('Webhook not configured')
        }

        const raw = req.rawBody?.toString('utf8') ?? ''
        if (!verifySvixSignature(secret, { id, timestamp, signature }, raw)) {
            throw new UnauthorizedException('Invalid webhook signature')
        }

        const event = JSON.parse(raw) as ResendWebhookEvent
        // "email.delivered" → "delivered"; bounded set from Resend, low cardinality.
        const name = event.type?.replace(/^email\./, '') ?? 'unknown'
        const type = emailType(event)

        this.emailEvents.inc({ event: name, type })
        this.logger.info({ event: name, type }, 'resend webhook event')
    }
}
