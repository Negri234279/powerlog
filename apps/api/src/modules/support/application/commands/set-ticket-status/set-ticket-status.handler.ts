import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { TicketNotFoundError } from '../../../domain/errors/support.errors'
import { SupportTicketRepository } from '../../../domain/repositories/support-ticket.repository'
import { Clock } from '../../ports/clock.port'
import { SetTicketStatusCommand } from './set-ticket-status.command'

@CommandHandler(SetTicketStatusCommand)
export class SetTicketStatusHandler implements ICommandHandler<SetTicketStatusCommand, boolean> {
    constructor(
        private readonly tickets: SupportTicketRepository,
        private readonly clock: Clock,
    ) {}

    async execute(command: SetTicketStatusCommand): Promise<boolean> {
        const ticket = await this.tickets.findById(command.ticketId)
        if (!ticket) throw new TicketNotFoundError()

        const now = this.clock.now()
        if (command.status === 'closed') ticket.close(now)
        else ticket.reopen(now)

        await this.tickets.save(ticket)

        return true
    }
}
