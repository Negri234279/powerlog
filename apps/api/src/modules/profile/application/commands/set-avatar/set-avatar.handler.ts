import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { ProfileNotFoundError } from '../../../domain/errors/profile.errors'
import { ProfileRepository } from '../../../domain/repositories/profile.repository'
import { Clock } from '../../ports/clock.port'
import { type ProfileView, toProfileView } from '../../queries/get-my-profile/get-my-profile.handler'
import { AvatarIngestor } from '../../services/avatar-ingestor.service'
import { AvatarUrls } from '../../services/avatar-urls.service'
import { SetAvatarCommand } from './set-avatar.command'

@CommandHandler(SetAvatarCommand)
export class SetAvatarHandler implements ICommandHandler<SetAvatarCommand, ProfileView> {
    constructor(
        private readonly profiles: ProfileRepository,
        private readonly ingestor: AvatarIngestor,
        private readonly avatarUrls: AvatarUrls,
        private readonly clock: Clock,
    ) {}

    async execute(command: SetAvatarCommand): Promise<ProfileView> {
        const profile = await this.profiles.findByUserId(command.userId)
        if (!profile) {
            throw new ProfileNotFoundError()
        }

        const key = await this.ingestor.ingest(command.userId, command.file)
        profile.setAvatar(key, this.clock.now())
        await this.profiles.save(profile)
        return toProfileView(profile, this.avatarUrls.resolve(profile.avatarKey, profile.updatedAt))
    }
}
