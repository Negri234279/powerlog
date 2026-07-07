import { Logger } from '@nestjs/common'
import { CommandHandler, EventBus, EventPublisher, type ICommandHandler } from '@nestjs/cqrs'

import { ProfileProvisioner } from '../../../../../shared/contracts/profile-provisioner'
import { UserRegisteredIntegrationEvent } from '../../../../../shared/integration-events/user-registered.integration-event'
import { UserAggregate } from '../../../domain/entities/user.entity'
import { EmailAlreadyInUseError } from '../../../domain/errors/auth.errors'
import { UserRepository } from '../../../domain/repositories/user.repository'
import { EmailVO } from '../../../domain/value-objects/email.vo'
import { PasswordHashVO } from '../../../domain/value-objects/password-hash.vo'
import { UnitsVO } from '../../../domain/value-objects/units.vo'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import { PasswordHasher } from '../../ports/password-hasher.port'
import type { AuthSessionResult } from '../../results/auth-session.result'
import { SessionIssuer } from '../../services/session-issuer.service'
import { RegisterUserCommand } from './register-user.command'

@CommandHandler(RegisterUserCommand)
export class RegisterUserHandler implements ICommandHandler<RegisterUserCommand, AuthSessionResult> {
    private readonly logger = new Logger(RegisterUserHandler.name)

    constructor(
        private readonly users: UserRepository,
        private readonly hasher: PasswordHasher,
        private readonly ids: IdGenerator,
        private readonly clock: Clock,
        private readonly sessions: SessionIssuer,
        private readonly publisher: EventPublisher,
        private readonly eventBus: EventBus,
        private readonly profiles: ProfileProvisioner,
    ) {}

    async execute(command: RegisterUserCommand): Promise<AuthSessionResult> {
        const email = EmailVO.create(command.email)

        if (await this.users.findByEmail(email)) {
            throw new EmailAlreadyInUseError()
        }

        const passwordHash = PasswordHashVO.fromHash(await this.hasher.hash(command.password))
        const units = command.units ? UnitsVO.create(command.units) : UnitsVO.default()

        const user = this.publisher.mergeObjectContext(
            UserAggregate.register({
                id: this.ids.uuid(),
                email,
                passwordHash,
                units,
                now: this.clock.now(),
            }),
        )
        await this.users.save(user)
        user.commit()

        // Atomic-ish registration: provision the profile synchronously BEFORE
        // publishing the event (so the optional sign-up details are applied, not
        // pre-empted by the fire-and-forget event handler). If it fails, roll the
        // registration back by deleting the just-created user, so no half-account
        // survives and the client gets a clean error instead of a broken session.
        try {
            await this.profiles.provision({
                userId: user.id,
                email: user.email.value,
                username: command.username,
                firstName: command.profile?.firstName,
                lastName: command.profile?.lastName,
                birthDate: command.profile?.birthDate,
                heightCm: command.profile?.heightCm,
                locale: command.profile?.locale,
            })
        } catch (err) {
            await this.rollback(user.id)
            throw err
        }

        // Cross-module: drives email verification. The profile already exists
        // from the synchronous provisioning above.
        this.eventBus.publish(new UserRegisteredIntegrationEvent(user.id, user.email.value, 'password'))

        const session = await this.sessions.issue(
            {
                userId: user.id,
                email: user.email.value,
                role: user.role.value,
                isAdmin: user.isAdmin,
            },
            undefined,
            command.device,
        )
        return {
            userId: user.id,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
        }
    }

    /**
     * Compensation for a failed profile provisioning: delete the just-created
     * user so registration is all-or-nothing. Best-effort — if the delete itself
     * fails we log it (an orphan user is left) but still surface the original
     * provisioning error to the caller.
     */
    private async rollback(userId: string): Promise<void> {
        try {
            await this.users.delete(userId)
        } catch (err) {
            this.logger.error(`Failed to roll back user ${userId} after profile provisioning error: ${String(err)}`)
        }
    }
}
