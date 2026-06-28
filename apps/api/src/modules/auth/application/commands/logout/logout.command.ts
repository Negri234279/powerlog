/**
 * Revoke the presented refresh token. `refreshToken` may be undefined (no
 * cookie) — logout is idempotent and still clears cookies in presentation.
 */
export class LogoutCommand {
    constructor(public readonly refreshToken: string | undefined) {}
}
