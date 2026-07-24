import { Controller, HttpCode, Post, type RawBodyRequest, Req, UnauthorizedException } from '@nestjs/common'
import { CommandBus } from '@nestjs/cqrs'
import type { Request } from 'express'
import { PinoLogger } from 'nestjs-pino'

import { HandleGatewayEventCommand } from '../../application/commands/handle-gateway-event/handle-gateway-event.command'
import { BillingMetrics } from '../../application/ports/billing-metrics.port'
import { GatewayProvider } from '../../application/ports/gateway-provider.port'

/**
 * `POST /webhooks/paypal` — the same sanctioned REST exception as Stripe's, and
 * the same contract downstream: verify, translate, hand a normalized event to the
 * one pipeline that writes billing state.
 *
 * The difference is how "verify" works. PayPal does not sign with a shared secret:
 * it signs with a certificate and **you ask its API whether the event is genuine**,
 * passing five headers, the raw body and the webhook id. So verification is a
 * network call, it needs `PAYPAL_WEBHOOK_ID`, and without it the endpoint refuses
 * everything rather than trusting a payload that says a payment happened.
 */
@Controller('webhooks/paypal')
export class PayPalWebhookController {
    constructor(
        private readonly gateways: GatewayProvider,
        private readonly commandBus: CommandBus,
        private readonly metrics: BillingMetrics,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(PayPalWebhookController.name)
    }

    @Post()
    @HttpCode(200)
    async handle(@Req() request: RawBodyRequest<Request>): Promise<{ received: true }> {
        const rawBody = request.rawBody
        if (!rawBody) throw new UnauthorizedException('Missing body.')

        const gateway = this.gateways.get('paypal')

        let event
        try {
            event = await gateway.verifyWebhook(rawBody, request.headers as Record<string, string | undefined>)
        } catch (error) {
            // Never log the payload of something we could not authenticate — and the
            // `type` label comes from that payload, so it is 'unknown' on purpose.
            this.metrics.recordWebhook('paypal', 'unknown', 'rejected')
            this.logger.warn({ err: error }, 'rejected an unverifiable paypal webhook')

            throw new UnauthorizedException('Invalid signature.')
        }

        const command = new HandleGatewayEventCommand(event)
        await this.commandBus.execute<HandleGatewayEventCommand, void>(command)

        return { received: true }
    }
}
