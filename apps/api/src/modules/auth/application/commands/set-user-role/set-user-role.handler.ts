import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs'

import { Entitlements } from '../../../../../shared/contracts/entitlements'
import { ProfileSnapshotReader } from '../../../../../shared/contracts/profile-snapshot-reader'
import { UserRoleChangedIntegrationEvent } from '../../../../../shared/integration-events/user-role-changed.integration-event'
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
        private readonly entitlements: Entitlements,
        private readonly eventBus: EventBus,
    ) {}

    async execute(command: SetUserRoleCommand): Promise<AdminUserView> {
        const user = await this.users.findById(command.targetUserId)
        if (!user) {
            throw new UserNotFoundError()
        }

        const role = UserRoleVO.create(command.role)
        const changed = !user.role.equals(role)
        user.setRole(role, this.clock.now())
        await this.users.save(user)

        // With no live subscription the role IS the plan (each role falls back to
        // its own free plan), so this has just changed what the user may do. Told
        // before reading the plan back, or we'd report the one they no longer have.
        // Only when it really moved: `setRole` is idempotent, and an event saying
        // "changed" about a no-op would be a lie to every future consumer.
        if (changed) {
            this.eventBus.publish(new UserRoleChangedIntegrationEvent(user.id, user.role.value))
        }

        const snapshot = await this.profiles.read(user.id)
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
