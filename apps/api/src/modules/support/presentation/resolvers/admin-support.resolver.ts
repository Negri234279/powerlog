import { UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql'

import { AdminGuard } from '../../../../auth/admin.guard'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import type { TicketCategory } from '../../domain/ticket-category'
import type { TicketStatus } from '../../domain/ticket-status'
import { SetTicketStatusCommand } from '../../application/commands/set-ticket-status/set-ticket-status.command'
import type { AdminSupportTicketDetailView } from '../../application/queries/admin-support-ticket/admin-support-ticket.handler'
import { AdminSupportTicketQuery } from '../../application/queries/admin-support-ticket/admin-support-ticket.query'
import type { AdminSupportTicketsPageView } from '../../application/queries/admin-support-tickets/admin-support-tickets.handler'
import { AdminSupportTicketsQuery } from '../../application/queries/admin-support-tickets/admin-support-tickets.query'
import {
    categoriesArg,
    DEFAULT_LIMIT,
    limitArg,
    offsetArg,
    searchArg,
    setStatusArg,
    statusesArg,
    uuidArg,
} from '../inputs/admin-support.inputs'
import { AdminSupportTicketDetailType, AdminSupportTicketPageType } from '../types/support.types'

/** Admin-only support inbox: list, detail (thread) and close/reopen. */
@Resolver()
@UseGuards(JwtCookieGuard, AdminGuard)
export class AdminSupportResolver {
    constructor(
        private readonly queryBus: QueryBus,
        private readonly commandBus: CommandBus,
    ) {}

    @Query(() => AdminSupportTicketPageType, { description: 'Support tickets, filtered + paginated (admin only).' })
    async adminSupportTickets(
        @Args('statuses', { type: () => [String], nullable: true }, new ZodValidationPipe(statusesArg))
        statuses?: TicketStatus[],
        @Args('categories', { type: () => [String], nullable: true }, new ZodValidationPipe(categoriesArg))
        categories?: TicketCategory[],
        @Args('search', { type: () => String, nullable: true }, new ZodValidationPipe(searchArg)) search?: string,
        @Args('limit', { type: () => Int, nullable: true }, new ZodValidationPipe(limitArg)) limit?: number,
        @Args('offset', { type: () => Int, nullable: true }, new ZodValidationPipe(offsetArg)) offset?: number,
    ): Promise<AdminSupportTicketsPageView> {
        const query = new AdminSupportTicketsQuery(
            { statuses, categories, search },
            limit ?? DEFAULT_LIMIT,
            offset ?? 0,
        )
        return this.queryBus.execute(query)
    }

    @Query(() => AdminSupportTicketDetailType, {
        nullable: true,
        description: 'One support ticket with its full thread (admin only). Null if it does not exist.',
    })
    async adminSupportTicket(
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<AdminSupportTicketDetailView | null> {
        const query = new AdminSupportTicketQuery(id)
        return this.queryBus.execute(query)
    }

    @Mutation(() => Boolean, { description: 'Close or reopen a support ticket (admin only).' })
    async setTicketStatus(
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
        @Args('status', { type: () => String }, new ZodValidationPipe(setStatusArg)) status: TicketStatus,
    ): Promise<boolean> {
        const command = new SetTicketStatusCommand(id, status)
        return this.commandBus.execute(command)
    }
}
