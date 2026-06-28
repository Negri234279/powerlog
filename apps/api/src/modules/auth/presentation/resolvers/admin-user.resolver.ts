import { UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql'

import { AdminGuard } from '../../../../auth/admin.guard'
import type { AuthUser } from '../../../../auth/auth-user'
import { CurrentUser } from '../../../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import { SetUserAdminCommand } from '../../application/commands/set-user-admin/set-user-admin.command'
import { SetUserRoleCommand } from '../../application/commands/set-user-role/set-user-role.command'
import { SetUserStatusCommand } from '../../application/commands/set-user-status/set-user-status.command'
import { AdminUserStatsQuery } from '../../application/queries/admin-user-stats/admin-user-stats.query'
import type { AdminUserStats } from '../../application/ports/admin-user.read-model'
import type { AdminUsersPageView, AdminUserView } from '../../application/queries/admin-users/admin-users.handler'
import { AdminUsersQuery } from '../../application/queries/admin-users/admin-users.query'
import type { AccountStatus } from '../../domain/entities/user.entity'
import type { UserRoleValue } from '../../domain/value-objects/user-role.vo'
import {
    SetUserAdminInput,
    SetUserRoleInput,
    SetUserStatusInput,
    isAdminArg,
    limitArg,
    offsetArg,
    rolesArg,
    searchArg,
    setUserAdminSchema,
    setUserRoleSchema,
    setUserStatusSchema,
    statusesArg,
    verifiedArg,
} from '../inputs/admin-user.inputs'
import { AdminUserPageType, AdminUserStatsType, AdminUserType } from '../types/admin-user.type'

const DEFAULT_LIMIT = 25

/** Admin-only user management: listing, aggregate stats, role + admin changes. */
@Resolver(() => AdminUserType)
@UseGuards(JwtCookieGuard, AdminGuard)
export class AdminUserResolver {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Query(() => AdminUserPageType, { description: 'List users with filters + offset pagination (admin only).' })
    async adminUsers(
        @Args('roles', { type: () => [String], nullable: true }, new ZodValidationPipe(rolesArg))
        roles?: UserRoleValue[],
        @Args('statuses', { type: () => [String], nullable: true }, new ZodValidationPipe(statusesArg))
        statuses?: AccountStatus[],
        @Args('isAdmin', { type: () => Boolean, nullable: true }, new ZodValidationPipe(isAdminArg))
        isAdmin?: boolean,
        @Args('verified', { type: () => Boolean, nullable: true }, new ZodValidationPipe(verifiedArg))
        verified?: boolean,
        @Args('search', { type: () => String, nullable: true }, new ZodValidationPipe(searchArg)) search?: string,
        @Args('limit', { type: () => Int, nullable: true }, new ZodValidationPipe(limitArg)) limit?: number,
        @Args('offset', { type: () => Int, nullable: true }, new ZodValidationPipe(offsetArg)) offset?: number,
    ): Promise<AdminUsersPageView> {
        return this.queryBus.execute<AdminUsersQuery, AdminUsersPageView>(
            new AdminUsersQuery({ roles, statuses, isAdmin, verified, search }, limit ?? DEFAULT_LIMIT, offset ?? 0),
        )
    }

    @Query(() => AdminUserStatsType, { description: 'Aggregate user counts for the admin dashboard.' })
    async adminUserStats(): Promise<AdminUserStats> {
        return this.queryBus.execute<AdminUserStatsQuery, AdminUserStats>(new AdminUserStatsQuery())
    }

    @Mutation(() => AdminUserType, { description: "Set a user's role (athlete ↔ coach)." })
    async setUserRole(
        @Args('input', new ZodValidationPipe(setUserRoleSchema)) input: SetUserRoleInput,
    ): Promise<AdminUserView> {
        return this.commandBus.execute<SetUserRoleCommand, AdminUserView>(
            new SetUserRoleCommand(input.userId, input.role as UserRoleValue),
        )
    }

    @Mutation(() => AdminUserType, { description: 'Grant or revoke platform admin (cannot revoke your own).' })
    async setUserAdmin(
        @CurrentUser() actor: AuthUser,
        @Args('input', new ZodValidationPipe(setUserAdminSchema)) input: SetUserAdminInput,
    ): Promise<AdminUserView> {
        return this.commandBus.execute<SetUserAdminCommand, AdminUserView>(
            new SetUserAdminCommand(actor.userId, input.userId, input.isAdmin),
        )
    }

    @Mutation(() => AdminUserType, {
        description: 'Disable (suspend) or re-enable a user account. Disabling signs them out.',
    })
    async setUserStatus(
        @CurrentUser() actor: AuthUser,
        @Args('input', new ZodValidationPipe(setUserStatusSchema)) input: SetUserStatusInput,
    ): Promise<AdminUserView> {
        return this.commandBus.execute<SetUserStatusCommand, AdminUserView>(
            new SetUserStatusCommand(actor.userId, input.userId, input.disabled),
        )
    }
}
