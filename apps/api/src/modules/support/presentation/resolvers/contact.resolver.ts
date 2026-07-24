import { CommandBus } from '@nestjs/cqrs'
import { Args, Mutation, Resolver } from '@nestjs/graphql'
import { Throttle } from '@nestjs/throttler'

import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import type { TicketCategory } from '../../domain/ticket-category'
import { SubmitContactMessageCommand } from '../../application/commands/submit-contact-message/submit-contact-message.command'
import { ContactInput, contactSchema } from '../inputs/contact.input'

const MINUTE = 60_000
/** Public and unauthenticated, so it's rate-limited per IP to blunt abuse. */
const RATE = { contact: { default: { ttl: MINUTE, limit: 3 } } }

@Resolver()
export class ContactResolver {
    constructor(private readonly commandBus: CommandBus) {}

    @Throttle(RATE.contact)
    @Mutation(() => Boolean, {
        description: 'Send a contact/support message (public). Opens a support ticket and notifies the team.',
    })
    async sendContactMessage(
        @Args('input', new ZodValidationPipe(contactSchema)) input: ContactInput,
    ): Promise<boolean> {
        // A filled honeypot is a bot: report success and do nothing, so it can't
        // tell it was caught and won't retry another way.
        if (input.website && input.website.trim() !== '') return true

        const command = new SubmitContactMessageCommand(
            input.name ?? null,
            input.email,
            input.category as TicketCategory,
            input.subject,
            input.message,
        )
        await this.commandBus.execute(command)

        return true
    }
}
