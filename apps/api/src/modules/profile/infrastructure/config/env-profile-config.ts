import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import type { Env } from '../../../../config/env'
import { ProfileConfig } from '../../application/ports/profile-config.port'

/** ProfileConfig bound from validated env. */
@Injectable()
export class EnvProfileConfig extends ProfileConfig {
    readonly defaultAvatarUrl: string

    constructor(config: ConfigService<Env, true>) {
        super()
        this.defaultAvatarUrl = config.get('AVATAR_DEFAULT_URL', { infer: true })
    }
}
