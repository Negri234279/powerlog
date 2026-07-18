import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { Entitlements } from '../../../../../shared/contracts/entitlements'
import { ProfileSnapshotReader } from '../../../../../shared/contracts/profile-snapshot-reader'
import { CannotDisableOwnAccountError, UserNotFoundError } from '../../../domain/errors/auth.errors'
import { RefreshTokenRepository } from '../../../domain/repositories/refresh-token.repository'
import { UserRepository } from '../../../domain/repositories/user.repository'
import { Clock } from '../../ports/clock.port'
import type { AdminUserView } from '../../queries/admin-users/admin-users.handler'
import { SetUserStatusCommand } from './set-user-status.command'

@CommandHandler(SetUserStatusCommand)
export class SetUserStatusHandler implements ICommandHandler<SetUserStatusCommand, AdminUserView> {
    constructor(
        private readonly users: UserRepository,
        private readonly refreshTokens: RefreshTokenRepository,
        private readonly clock: Clock,
        private readonly profiles: ProfileSnapshotReader,
        private readonly entitlements: Entitlements,
    ) {}

    async execute(command: SetUserStatusCommand): Promise<AdminUserView> {
        // Lockout safeguard: an admin can't disable their own account.
        if (command.disabled && command.actingUserId === command.targetUserId) {
            throw new CannotDisableOwnAccountError()
        }

        const user = await this.users.findById(command.targetUserId)
        if (!user) {
            throw new UserNotFoundError()
        }

        const now = this.clock.now()
        if (command.disabled) {
            user.disable(now) // throws AccountDeletedError on a deleted account
        } else {
            user.enable(now)
        }
        await this.users.save(user)

        // Disabling logs the user out everywhere: their access token still works
        // until it expires (≤15m) but it can no longer be renewed.
        if (command.disabled) {
            await this.refreshTokens.revokeAllForUser(user.id)
        }

        const snapshot = await this.profiles.read(user.id).catch(() => null)
        // Disabling an account doesn't end its subscription — the plan cell keeps
        // saying what they are still paying for, which is the point of seeing it.
        const entitlements = await this.entitlements.forUser(user.id).catch(() => null)

        return {
            id: user.id,
            email: user.email.value,
            username: snapshot?.username ?? null,
            role: user.role.value,
            isAdmin: user.isAdmin,
            status: user.status,
            emailVerified: user.isEmailVerified(),
            plan: entitlements ? (entitlements.coach?.plan ?? entitlements.athlete.plan) : null,
            createdAt: user.createdAt,
        }
    }
}
