import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs'

import { UserDirectory } from '../../../../../shared/contracts/user-directory'
import { SupportTicketEntity } from '../../../domain/entities/support-ticket.entity'
import { SupportTicketRepository } from '../../../domain/repositories/support-ticket.repository'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import { SupportMetrics } from '../../ports/support-metrics.port'
import { SupportTicketOpenedIntegrationEvent } from '../../events/support-ticket-opened.integration-event'
import { SubmitContactMessageCommand } from './submit-contact-message.command'

@CommandHandler(SubmitContactMessageCommand)
export class SubmitContactMessageHandler implements ICommandHandler<SubmitContactMessageCommand, string> {
    constructor(
        private readonly tickets: SupportTicketRepository,
        private readonly users: UserDirectory,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
        private readonly metrics: SupportMetrics,
        private readonly eventBus: EventBus,
    ) {}

    async execute(command: SubmitContactMessageCommand): Promise<string> {
        const email = command.email.trim().toLowerCase()

        // Link the ticket to an account when the sender already has one — this is
        // what turns a contact message into a support ticket for a known user. An
        // unknown email is fine: the ticket stands on its own.
        const requesterUserId = await this.users.findUserIdByEmail(email)

        const now = this.clock.now()
        const ticket = SupportTicketEntity.open({
            id: this.ids.uuid(),
            category: command.category,
            subject: command.subject,
            requesterEmail: email,
            requesterName: command.name,
            requesterUserId,
            message: { id: this.ids.uuid(), body: command.message },
            now,
        })

        await this.tickets.save(ticket)
        this.metrics.recordTicketOpened(command.category)

        // The ticket is stored; the admin notification is best-effort, off this event.
        const event = new SupportTicketOpenedIntegrationEvent(
            ticket.id,
            command.category,
            command.subject,
            email,
            command.name,
            requesterUserId,
            command.message,
        )
        this.eventBus.publish(event)

        return ticket.id
    }
}
