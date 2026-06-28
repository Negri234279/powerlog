import { Injectable } from '@nestjs/common'

import { AvatarStorage } from '../ports/avatar-storage.port'
import { ProfileConfig } from '../ports/profile-config.port'

/** Resolves a stored avatar key to a public URL, or the default when unset. */
@Injectable()
export class AvatarUrls {
    constructor(
        private readonly storage: AvatarStorage,
        private readonly config: ProfileConfig,
    ) {}

    resolve(key: string | null): string | null {
        if (key) return this.storage.urlFor(key)
        return this.config.defaultAvatarUrl || null
    }
}
