import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { ProfileNotFoundError } from '../../../domain/errors/profile.errors'
import { ProfileRepository } from '../../../domain/repositories/profile.repository'
import { AvatarStorage } from '../../ports/avatar-storage.port'
import { Clock } from '../../ports/clock.port'
import { type ProfileView, toProfileView } from '../../queries/get-my-profile/get-my-profile.handler'
import { AvatarUrls } from '../../services/avatar-urls.service'
import { RemoveAvatarCommand } from './remove-avatar.command'

@CommandHandler(RemoveAvatarCommand)
export class RemoveAvatarHandler implements ICommandHandler<RemoveAvatarCommand, ProfileView> {
    constructor(
        private readonly profiles: ProfileRepository,
        private readonly storage: AvatarStorage,
        private readonly avatarUrls: AvatarUrls,
        private readonly clock: Clock,
    ) {}

    async execute(command: RemoveAvatarCommand): Promise<ProfileView> {
        const profile = await this.profiles.findByUserId(command.userId)
        if (!profile) {
            throw new ProfileNotFoundError()
        }

        const previousKey = profile.avatarKey
        profile.removeAvatar(this.clock.now())
        await this.profiles.save(profile)

        // Best-effort cleanup of the stored object; never fail the request on it.
        if (previousKey) {
            await this.storage.delete(previousKey).catch(() => undefined)
        }
        return toProfileView(profile, this.avatarUrls.resolve(profile.avatarKey))
    }
}
