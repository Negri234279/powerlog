import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import type { UpdateProfileFields } from '../../../domain/entities/profile.entity'
import { DisplayNameAlreadyInUseError, ProfileNotFoundError } from '../../../domain/errors/profile.errors'
import { ProfileRepository } from '../../../domain/repositories/profile.repository'
import { BioVO } from '../../../domain/value-objects/bio.vo'
import { BirthDateVO } from '../../../domain/value-objects/birth-date.vo'
import { DisplayNameVO } from '../../../domain/value-objects/display-name.vo'
import { HeightVO } from '../../../domain/value-objects/height.vo'
import { PersonNameVO } from '../../../domain/value-objects/person-name.vo'
import { SexVO } from '../../../domain/value-objects/sex.vo'
import { Clock } from '../../ports/clock.port'
import { type ProfileView, toProfileView } from '../../queries/get-my-profile/get-my-profile.handler'
import { AvatarUrls } from '../../services/avatar-urls.service'
import { type UpdateProfileFieldsRaw, UpdateProfileCommand } from './update-profile.command'

@CommandHandler(UpdateProfileCommand)
export class UpdateProfileHandler implements ICommandHandler<UpdateProfileCommand, ProfileView> {
    constructor(
        private readonly profiles: ProfileRepository,
        private readonly clock: Clock,
        private readonly avatarUrls: AvatarUrls,
    ) {}

    async execute(command: UpdateProfileCommand): Promise<ProfileView> {
        const profile = await this.profiles.findByUserId(command.userId)
        if (!profile) {
            throw new ProfileNotFoundError()
        }

        // The display name IS the unique handle: reject a change that collides
        // with another user before writing anything.
        const fields = this.toDomainFields(command.fields)
        if (fields.displayName) {
            const owner = await this.profiles.findByDisplayName(fields.displayName.value)
            if (owner && owner.userId !== command.userId) {
                throw new DisplayNameAlreadyInUseError()
            }
        }

        profile.update(fields, this.clock.now())
        await this.profiles.save(profile)
        return toProfileView(profile, this.avatarUrls.resolve(profile.avatarKey, profile.updatedAt))
    }

    /** Maps raw fields → VOs. Only keys explicitly present are included. */
    private toDomainFields(raw: UpdateProfileFieldsRaw): UpdateProfileFields {
        const fields: UpdateProfileFields = {}
        if (raw.displayName !== undefined) fields.displayName = DisplayNameVO.create(raw.displayName)
        if (raw.firstName !== undefined)
            fields.firstName = raw.firstName === null ? null : PersonNameVO.create(raw.firstName)
        if (raw.lastName !== undefined)
            fields.lastName = raw.lastName === null ? null : PersonNameVO.create(raw.lastName)
        if (raw.birthDate !== undefined)
            fields.birthDate = raw.birthDate === null ? null : BirthDateVO.create(raw.birthDate)
        if (raw.sex !== undefined) fields.sex = raw.sex === null ? null : SexVO.create(raw.sex)
        if (raw.heightCm !== undefined) fields.height = raw.heightCm === null ? null : HeightVO.create(raw.heightCm)
        if (raw.bio !== undefined) fields.bio = raw.bio === null ? null : BioVO.create(raw.bio)
        if (raw.country !== undefined) fields.country = raw.country
        if (raw.timezone !== undefined) fields.timezone = raw.timezone
        if (raw.locale !== undefined) fields.locale = raw.locale
        return fields
    }
}
