import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import type { Env } from '../../../../config/env'
import { parseDurationMs } from '../../../../shared/duration'
import { AuthConfig } from '../../application/ports/auth-config.port'

/** AuthConfig bound from validated env. */
@Injectable()
export class EnvAuthConfig extends AuthConfig {
    readonly refreshTokenTtlMs: number
    readonly emailVerificationTtlMs: number
    readonly passwordResetTtlMs: number
    readonly webOrigin: string

    constructor(config: ConfigService<Env, true>) {
        super()
        this.refreshTokenTtlMs = parseDurationMs(config.get('REFRESH_EXPIRES_IN', { infer: true }))
        this.emailVerificationTtlMs = parseDurationMs(config.get('EMAIL_VERIFICATION_TTL', { infer: true }))
        this.passwordResetTtlMs = parseDurationMs(config.get('PASSWORD_RESET_TTL', { infer: true }))
        this.webOrigin = config.get('WEB_ORIGIN', { infer: true })
    }
}
