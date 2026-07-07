import type { DeviceInfo } from '../../services/session-issuer.service'

/** Optional profile details captured at sign-up (provisioned atomically). */
export interface RegisterProfileDetails {
    firstName?: string | null
    lastName?: string | null
    /** Calendar date as YYYY-MM-DD. */
    birthDate?: string | null
    /** Whole centimetres. */
    heightCm?: number | null
    /** BCP-47 UI locale chosen at sign-up (e.g. "es"); null when unknown. */
    locale?: string | null
}

/** Register a new user with email + password + username. `units` defaults to "kg". */
export class RegisterUserCommand {
    constructor(
        public readonly email: string,
        public readonly password: string,
        public readonly username: string,
        public readonly units?: string,
        public readonly profile?: RegisterProfileDetails,
        public readonly device?: DeviceInfo,
    ) {}
}
