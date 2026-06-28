import { Logger } from '@nestjs/common'
import { CommandHandler, EventBus, EventPublisher, type ICommandHandler } from '@nestjs/cqrs'

import { ProfileProvisioner } from '../../../../../shared/contracts/profile-provisioner'
import { GoogleIdentityLinkedIntegrationEvent } from '../../../../../shared/integration-events/google-identity-linked.integration-event'
import type { GoogleProfileSnapshot } from '../../../../../shared/integration-events/google-profile-snapshot'
import { UserRegisteredIntegrationEvent } from '../../../../../shared/integration-events/user-registered.integration-event'
import { UserAggregate } from '../../../domain/entities/user.entity'
import { UserRepository } from '../../../domain/repositories/user.repository'
import { EmailVO } from '../../../domain/value-objects/email.vo'
import { UnitsVO } from '../../../domain/value-objects/units.vo'
import { AuthMetrics } from '../../ports/auth-metrics.port'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import type { AuthSessionResult } from '../../results/auth-session.result'
import { SessionIssuer } from '../../services/session-issuer.service'
import { LoginWithGoogleCommand } from './login-with-google.command'

const GOOGLE = 'google' as const

@CommandHandler(LoginWithGoogleCommand)
export class LoginWithGoogleHandler implements ICommandHandler<LoginWithGoogleCommand, AuthSessionResult> {
    private readonly logger = new Logger(LoginWithGoogleHandler.name)

    constructor(
        private readonly users: UserRepository,
        private readonly ids: IdGenerator,
        private readonly clock: Clock,
        private readonly sessions: SessionIssuer,
        private readonly profiles: ProfileProvisioner,
        private readonly publisher: EventPublisher,
        private readonly eventBus: EventBus,
        private readonly metrics: AuthMetrics,
    ) {}

    async execute(command: LoginWithGoogleCommand): Promise<AuthSessionResult> {
        const now = this.clock.now()
        const identity = { provider: GOOGLE, providerId: command.googleId }
        const snapshot = this.snapshotOf(command)

        // 1) Known Google identity → that user (already linked; nothing to seed).
        let user = await this.users.findByIdentity(GOOGLE, command.googleId)

        if (!user) {
            const email = EmailVO.create(command.email)
            const existing = await this.users.findByEmail(email)

            if (existing) {
                // 2) Same email → auto-link the Google identity to that account.
                existing.linkIdentity(identity, now)
                await this.users.save(existing)
                user = existing
                // Lets the profile backfill empty name/avatar fields from Google.
                this.eventBus.publish(new GoogleIdentityLinkedIntegrationEvent(user.id, snapshot))
            } else {
                // 3) New passwordless account with the Google identity attached.
                const created = this.publisher.mergeObjectContext(
                    UserAggregate.register({
                        id: this.ids.uuid(),
                        email,
                        passwordHash: null,
                        units: UnitsVO.default(),
                        // Google has verified the email already.
                        emailVerifiedAt: now,
                        now,
                    }),
                )
                created.linkIdentity(identity, now)
                await this.users.save(created)
                created.commit()
                user = created

                // No handle was chosen → the profile module generates a unique one
                // from the email. Provision synchronously so the handle exists for
                // the JWT; roll back the user if it fails (no half-account).
                try {
                    await this.profiles.provision({
                        userId: user.id,
                        email: user.email.value,
                        firstName: command.firstName,
                        lastName: command.lastName,
                    })
                } catch (err) {
                    await this.rollback(user.id)
                    throw err
                }

                // Async backfill of the Google avatar/name onto the new profile.
                this.eventBus.publish(new UserRegisteredIntegrationEvent(user.id, user.email.value, 'google', snapshot))
            }
        }

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
        this.metrics.recordLogin('google', 'success')
        return {
            userId: user.id,
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
        }
    }

    /** Compensation for a failed profile provisioning: delete the just-created user. */
    private async rollback(userId: string): Promise<void> {
        try {
            await this.users.delete(userId)
        } catch (err) {
            this.logger.error(`Failed to roll back user ${userId} after profile provisioning error: ${String(err)}`)
        }
    }

    private snapshotOf(command: LoginWithGoogleCommand): GoogleProfileSnapshot {
        return {
            displayName: command.displayName,
            firstName: command.firstName,
            lastName: command.lastName,
            pictureUrl: command.pictureUrl,
        }
    }
}
