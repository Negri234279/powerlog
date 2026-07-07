import { Injectable } from '@nestjs/common'

import { ProfileSnapshotReader } from '../../../../shared/contracts/profile-snapshot-reader'
import { RefreshTokenRepository } from '../../domain/repositories/refresh-token.repository'
import type { UserRoleValue } from '../../domain/value-objects/user-role.vo'
import { AuthConfig } from '../ports/auth-config.port'
import { Clock } from '../ports/clock.port'
import { IdGenerator } from '../ports/id-generator.port'
import { RefreshTokenGenerator } from '../ports/refresh-token-generator.port'
import { TokenSigner } from '../ports/token-signer.port'

export interface IssuedSession {
    accessToken: string
    /** Raw refresh token for the cookie (never persisted in raw form). */
    refreshToken: string
    /** DB id of the persisted refresh token (used to link rotations). */
    refreshTokenId: string
}

/** Optional device metadata captured from the request for the sessions list. */
export interface DeviceInfo {
    userAgent?: string | null
    ip?: string | null
}

/**
 * Issues a session: signs a fresh access JWT and creates+persists a new
 * (hashed) refresh token. Shared by register/login/google/refresh handlers.
 */
@Injectable()
export class SessionIssuer {
    constructor(
        private readonly tokenSigner: TokenSigner,
        private readonly refreshGenerator: RefreshTokenGenerator,
        private readonly refreshTokens: RefreshTokenRepository,
        private readonly clock: Clock,
        private readonly config: AuthConfig,
        private readonly ids: IdGenerator,
        private readonly profiles: ProfileSnapshotReader,
    ) {}

    /**
     * Issues a session. A new login omits `family` (a fresh one is generated); a
     * rotation passes the existing token's `family` so the chain stays grouped.
     */
    async issue(
        claims: {
            userId: string
            email: string
            role: UserRoleValue
            isAdmin: boolean
        },
        family?: string,
        device?: DeviceInfo,
    ): Promise<IssuedSession> {
        const { userId } = claims
        // The handle + avatar live in the profile module (single source of truth);
        // read them at sign time so the JWT carries fresh values. The profile is
        // always provisioned before a session is issued, so it must exist.
        const snapshot = await this.profiles.read(userId)
        if (!snapshot) {
            throw new Error(`Cannot issue a session for ${userId}: no profile found.`)
        }
        const accessToken = await this.tokenSigner.signAccessToken({
            ...claims,
            username: snapshot.username,
            avatar: snapshot.avatarUrl,
            locale: snapshot.locale,
        })
        const { raw, hash } = this.refreshGenerator.generate()
        const expiresAt = new Date(this.clock.now().getTime() + this.config.refreshTokenTtlMs)
        const created = await this.refreshTokens.create({
            userId,
            family: family ?? this.ids.uuid(),
            tokenHash: hash,
            expiresAt,
            userAgent: device?.userAgent ?? null,
            ip: device?.ip ?? null,
        })

        return {
            accessToken,
            refreshToken: raw,
            refreshTokenId: created.id,
        }
    }
}
