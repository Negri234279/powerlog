import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { Entitlements } from '../../../../../shared/contracts/entitlements'
import { ProfileSnapshotReader } from '../../../../../shared/contracts/profile-snapshot-reader'
import { CannotRevokeOwnAdminError, UserNotFoundError } from '../../../domain/errors/auth.errors'
import { UserRepository } from '../../../domain/repositories/user.repository'
import { Clock } from '../../ports/clock.port'
import type { AdminUserView } from '../../queries/admin-users/admin-users.handler'
import { SetUserAdminCommand } from './set-user-admin.command'

@CommandHandler(SetUserAdminCommand)
export class SetUserAdminHandler implements ICommandHandler<SetUserAdminCommand, AdminUserView> {
    constructor(
        private readonly users: UserRepository,
        private readonly clock: Clock,
        private readonly profiles: ProfileSnapshotReader,
        private readonly entitlements: Entitlements,
    ) {}

    async execute(command: SetUserAdminCommand): Promise<AdminUserView> {
        // Lockout safeguard: an admin can't strip their own admin access.
        if (!command.isAdmin && command.actingUserId === command.targetUserId) {
            throw new CannotRevokeOwnAdminError()
        }

        const user = await this.users.findById(command.targetUserId)
        if (!user) {
            throw new UserNotFoundError()
        }

        user.setAdmin(command.isAdmin, this.clock.now())
        await this.users.save(user)

        const snapshot = await this.profiles.read(user.id)
        // Admin is orthogonal to the plan; read it only so the row the table
        // re-renders keeps its plan cell instead of blanking it.
        const entitlements = await this.entitlements.forUser(user.id).catch(() => null)

        return {
            id: user.id,
            email: user.email.value,
            username: snapshot?.username ?? null,
            role: user.role.value,
            isAdmin: user.isAdmin,
            status: user.status,
            emailVerified: user.isEmailVerified(),
            plan: entitlements?.plan ?? null,
            createdAt: user.createdAt,
        }
    }
}
