import type { UserRoleValue } from '../modules/auth/domain/value-objects/user-role.vo'

/**
 * The authenticated principal attached to the request by `JwtCookieGuard`
 * (from the validated access-token claims) and read via `@CurrentUser()`.
 * Shared across feature modules, so it lives outside `src/modules`.
 */
export interface AuthUser {
    userId: string
    email: string
    role: UserRoleValue
    isAdmin: boolean
    /** Resolved avatar URL from the profile; null → default. */
    avatar: string | null
}
