import { Injectable } from '@nestjs/common'

import { ProfileRepository } from '../../domain/repositories/profile.repository'
import { DisplayNameVO } from '../../domain/value-objects/display-name.vo'

const MAX_LENGTH = 30

/**
 * Derives a unique handle from a free-text seed (an email local-part, a Google
 * display name…). Used when no handle is supplied — e.g. Google sign-up.
 * Slugifies the seed, then appends an incremental numeric suffix until the
 * handle is free, trimming the base so the result stays within length limits.
 * Profile owns the handle now, so uniqueness is checked against `profiles`.
 */
@Injectable()
export class HandleGenerator {
    constructor(private readonly profiles: ProfileRepository) {}

    async generateFrom(seed: string): Promise<DisplayNameVO> {
        const base = DisplayNameVO.slugify(seed)

        if (!(await this.profiles.findByDisplayName(base))) {
            return DisplayNameVO.create(base)
        }

        for (let n = 1; ; n++) {
            const suffix = String(n)
            const candidate = base.slice(0, MAX_LENGTH - suffix.length) + suffix
            if (!(await this.profiles.findByDisplayName(candidate))) {
                return DisplayNameVO.create(candidate)
            }
        }
    }
}
