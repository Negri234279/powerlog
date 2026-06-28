import type { DeviceInfo } from '../../services/session-issuer.service'

/** Authenticate with email + password. */
export class LoginCommand {
    constructor(
        public readonly email: string,
        public readonly password: string,
        public readonly device?: DeviceInfo,
    ) {}
}
