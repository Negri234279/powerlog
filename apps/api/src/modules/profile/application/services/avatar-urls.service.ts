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

    /**
     * Resolves a stored avatar key to its public URL. The avatar key is stable
     * (`<userId>.webp`), so a re-upload reuses the same URL; passing `updatedAt`
     * appends a `?v=<epoch>` cache-buster so clients (and CDNs) fetch the new
     * image instead of a stale cached one. `null` key → the configured default.
     */
    resolve(key: string | null, updatedAt?: Date): string | null {
        if (key) {
            const url = this.storage.urlFor(key)
            return updatedAt ? `${url}?v=${updatedAt.getTime()}` : url
        }
        return this.config.defaultAvatarUrl || null
    }
}
