import type { DeviceInfo } from '../../services/session-issuer.service'

/** Rotate a refresh token: issue a new session and revoke the presented one. */
export class RefreshSessionCommand {
    constructor(
        public readonly refreshToken: string,
        public readonly device?: DeviceInfo,
    ) {}
}
