import { Controller, Headers, HttpCode, Post, type RawBodyRequest, Req, UnauthorizedException } from '@nestjs/common'
import { CommandBus } from '@nestjs/cqrs'
import type { Request } from 'express'
import { PinoLogger } from 'nestjs-pino'

import { HandleGatewayEventCommand } from '../../application/commands/handle-gateway-event/handle-gateway-event.command'
import { GatewayProvider } from '../../application/ports/gateway-provider.port'

/**
 * `POST /webhooks/stripe` — a **sanctioned REST endpoint**, like the Google OAuth
 * callback and the Resend webhook: a provider posting a signed payload cannot be
 * GraphQL.
 *
 * Two things this endpoint gets right on purpose:
 *  - **The signature is checked against the RAW bytes.** The app boots with
 *    `rawBody: true` for exactly this: the JSON parser would re-serialize the body
 *    and the signature would no longer match. An unsigned payload is somebody
 *    claiming a payment happened, so it is refused with a 401, never trusted.
 *  - **It answers 200 as soon as the work is done, and 500 only if the work
 *    failed.** Stripe retries a non-2xx, and that is what we want: a handler that
 *    blew up should get the event again, and meanwhile the event row sits there
 *    `failed` with its payload, ready to be replayed from the admin panel.
 */
@Controller('webhooks/stripe')
export class StripeWebhookController {
    constructor(
        private readonly gateways: GatewayProvider,
        private readonly commandBus: CommandBus,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(StripeWebhookController.name)
    }

    @Post()
    @HttpCode(200)
    async handle(
        @Req() request: RawBodyRequest<Request>,
        @Headers('stripe-signature') signature: string | undefined,
    ): Promise<{ received: true }> {
        const rawBody = request.rawBody
        if (!rawBody || !signature) throw new UnauthorizedException('Missing signature.')

        // Verification and translation both live in the gateway adapter, so no Stripe
        // type ever reaches the command that follows.
        const gateway = this.gateways.get('stripe')

        let event
        try {
            event = gateway.verifyWebhook(rawBody, signature)
        } catch (error) {
            // Never log the payload of something we could not authenticate.
            this.logger.warn({ err: error }, 'rejected an unverifiable stripe webhook')

            throw new UnauthorizedException('Invalid signature.')
        }

        const command = new HandleGatewayEventCommand(event)
        await this.commandBus.execute<HandleGatewayEventCommand, void>(command)

        return { received: true }
    }
}
