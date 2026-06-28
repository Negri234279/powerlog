import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { ProfileSnapshotReader } from '../../../../../shared/contracts/profile-snapshot-reader'
import { UserNotFoundError } from '../../../domain/errors/auth.errors'
import { UserRepository } from '../../../domain/repositories/user.repository'
import { UserRoleVO } from '../../../domain/value-objects/user-role.vo'
import { Clock } from '../../ports/clock.port'
import type { AdminUserView } from '../../queries/admin-users/admin-users.handler'
import { SetUserRoleCommand } from './set-user-role.command'

@CommandHandler(SetUserRoleCommand)
export class SetUserRoleHandler implements ICommandHandler<SetUserRoleCommand, AdminUserView> {
    constructor(
        private readonly users: UserRepository,
        private readonly clock: Clock,
        private readonly profiles: ProfileSnapshotReader,
    ) {}

    async execute(command: SetUserRoleCommand): Promise<AdminUserView> {
        const user = await this.users.findById(command.targetUserId)
        if (!user) {
            throw new UserNotFoundError()
        }

        user.setRole(UserRoleVO.create(command.role), this.clock.now())
        await this.users.save(user)

        const snapshot = await this.profiles.read(user.id)
        return {
            id: user.id,
            email: user.email.value,
            username: snapshot?.username ?? null,
            role: user.role.value,
            isAdmin: user.isAdmin,
            status: user.status,
            emailVerified: user.isEmailVerified(),
            createdAt: user.createdAt,
        }
    }
}
