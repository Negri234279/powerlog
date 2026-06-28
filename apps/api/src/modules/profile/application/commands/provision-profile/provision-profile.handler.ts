import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { ProvisionProfileCommand } from '../../../../../shared/contracts/provision-profile.command'
import { ProfileAggregate, type UpdateProfileFields } from '../../../domain/entities/profile.entity'
import { DisplayNameAlreadyInUseError } from '../../../domain/errors/profile.errors'
import { ProfileRepository } from '../../../domain/repositories/profile.repository'
import { BirthDateVO } from '../../../domain/value-objects/birth-date.vo'
import { DisplayNameVO } from '../../../domain/value-objects/display-name.vo'
import { HeightVO } from '../../../domain/value-objects/height.vo'
import { PersonNameVO } from '../../../domain/value-objects/person-name.vo'
import { Clock } from '../../ports/clock.port'
import { HandleGenerator } from '../../services/handle-generator.service'

/**
 * Creates the user's profile during registration with the optional details
 * captured at sign-up (name, birth date, height). Dispatched synchronously by
 * the auth register flow via the CommandBus, so a failure here propagates and
 * triggers the auth-side rollback. Idempotent on `userId` — re-running (e.g. the
 * UserRegistered event handler) is a no-op once a profile exists.
 */
@CommandHandler(ProvisionProfileCommand)
export class ProvisionProfileHandler implements ICommandHandler<ProvisionProfileCommand, void> {
    constructor(
        private readonly profiles: ProfileRepository,
        private readonly clock: Clock,
        private readonly handles: HandleGenerator,
    ) {}

    async execute(command: ProvisionProfileCommand): Promise<void> {
        if (await this.profiles.findByUserId(command.userId)) return

        const now = this.clock.now()
        const displayName = await this.resolveHandle(command)
        const profile = ProfileAggregate.create({
            userId: command.userId,
            displayName,
            firstName: command.firstName ? PersonNameVO.create(command.firstName) : null,
            lastName: command.lastName ? PersonNameVO.create(command.lastName) : null,
            now,
        })

        // Birth date / height aren't part of `create`; apply them through the
        // aggregate's update (which enforces the not-in-the-future rule).
        const fields: UpdateProfileFields = {}
        if (command.birthDate) fields.birthDate = BirthDateVO.create(command.birthDate)
        if (command.heightCm != null) fields.height = HeightVO.create(command.heightCm)
        if (Object.keys(fields).length > 0) profile.update(fields, now)

        await this.profiles.save(profile)
    }

    /**
     * Resolve the handle: a chosen one (register) is validated + checked for
     * uniqueness; an omitted one (Google) is auto-generated unique from the email.
     */
    private async resolveHandle(command: ProvisionProfileCommand): Promise<DisplayNameVO> {
        if (command.username === undefined) {
            return this.handles.generateFrom(command.email.split('@')[0] ?? command.email)
        }

        const displayName = DisplayNameVO.create(command.username)
        if (await this.profiles.findByDisplayName(displayName.value)) {
            throw new DisplayNameAlreadyInUseError()
        }
        return displayName
    }
}
