import type { UserRoleValue } from '../../domain/value-objects/user-role.vo'

/** Claims carried by the short-lived access JWT. */
export interface AccessTokenClaims {
    userId: string
    email: string
    username: string
    role: UserRoleValue
    isAdmin: boolean
    /** Resolved avatar URL from the profile; null → client shows the default. */
    avatar: string | null
}

/**
 * Signs and verifies the access JWT (RS256, via jose). Implemented in
 * infrastructure; the verify side is used by the JwtCookieGuard.
 */
export abstract class TokenSigner {
    abstract signAccessToken(claims: AccessTokenClaims): Promise<string>
    abstract verifyAccessToken(token: string): Promise<AccessTokenClaims>
}
