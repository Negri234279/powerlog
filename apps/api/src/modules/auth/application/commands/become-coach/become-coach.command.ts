import type { DeviceInfo } from '../../services/session-issuer.service'

/**
 * Promote the current user to coach (self-service). Re-issues the session so the
 * new role is effective immediately (no waiting for the access token to expire).
 */
export class BecomeCoachCommand {
    constructor(
        public readonly userId: string,
        public readonly device?: DeviceInfo,
    ) {}
}
