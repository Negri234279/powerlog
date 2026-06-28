/**
 * Sign in (or up) via Google after the backend has exchanged the auth code.
 * Carries the verified Google profile fields needed to find/link the user and
 * to seed the profile (name/avatar) in the profile module.
 */
import type { DeviceInfo } from '../../services/session-issuer.service'

export class LoginWithGoogleCommand {
    constructor(
        public readonly googleId: string,
        public readonly email: string,
        public readonly displayName?: string,
        public readonly firstName?: string,
        public readonly lastName?: string,
        public readonly pictureUrl?: string,
        public readonly device?: DeviceInfo,
    ) {}
}
