import { UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql'
import { z } from 'zod'

import type { AuthUser } from '../../../../auth/auth-user'
import { CurrentUser } from '../../../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import { MarkAllNotificationsReadCommand } from '../../application/commands/mark-all-notifications-read/mark-all-notifications-read.command'
import { MarkNotificationReadCommand } from '../../application/commands/mark-notification-read/mark-notification-read.command'
import { CountUnreadNotificationsQuery } from '../../application/queries/count-unread-notifications/count-unread-notifications.query'
import type { NotificationsPage } from '../../application/queries/list-notifications/list-notifications.handler'
import { ListNotificationsQuery } from '../../application/queries/list-notifications/list-notifications.query'
import type { NotificationEntity } from '../../domain/entities/notification.entity'
import { NotificationType, NotificationsPageType } from '../types/notification.type'

const uuidArg = z.string().uuid()
const limitArg = z.coerce.number().int().min(1).max(50).optional()
const cursorArg = z.string().min(1).optional()

const DEFAULT_LIMIT = 20

/** Maps a notification entity to its GraphQL view (payload as a JSON string). */
function toView(entity: NotificationEntity): NotificationType {
    return {
        id: entity.id,
        type: entity.type,
        data: JSON.stringify(entity.data),
        readAt: entity.readAt,
        createdAt: entity.createdAt,
    }
}

@Resolver(() => NotificationType)
@UseGuards(JwtCookieGuard)
export class NotificationResolver {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Query(() => NotificationsPageType, {
        description: "The caller's notification inbox, newest first (keyset-paginated).",
    })
    async myNotifications(
        @CurrentUser() user: AuthUser,
        @Args('limit', { type: () => Int, nullable: true }, new ZodValidationPipe(limitArg)) limit?: number,
        @Args('cursor', { type: () => String, nullable: true }, new ZodValidationPipe(cursorArg)) cursor?: string,
    ): Promise<NotificationsPageType> {
        const page = await this.queryBus.execute<ListNotificationsQuery, NotificationsPage>(
            new ListNotificationsQuery(user.userId, limit ?? DEFAULT_LIMIT, cursor),
        )

        return {
            items: page.items.map(toView),
            nextCursor: page.nextCursor,
            hasNextPage: page.hasNextPage,
        }
    }

    @Query(() => Int, { description: 'Number of unread notifications (the bell badge).' })
    async unreadNotificationsCount(@CurrentUser() user: AuthUser): Promise<number> {
        return this.queryBus.execute<CountUnreadNotificationsQuery, number>(
            new CountUnreadNotificationsQuery(user.userId),
        )
    }

    @Mutation(() => Boolean, { description: 'Mark one notification read (no-op if not the caller’s).' })
    async markNotificationRead(
        @CurrentUser() user: AuthUser,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<boolean> {
        return this.commandBus.execute<MarkNotificationReadCommand, boolean>(
            new MarkNotificationReadCommand(user.userId, id),
        )
    }

    @Mutation(() => Int, { description: 'Mark every notification read; returns how many changed.' })
    async markAllNotificationsRead(@CurrentUser() user: AuthUser): Promise<number> {
        return this.commandBus.execute<MarkAllNotificationsReadCommand, number>(
            new MarkAllNotificationsReadCommand(user.userId),
        )
    }
}
