/**
 * Synchronous request (CommandBus) to create a user's profile during
 * registration. Lives in the shared kernel so the auth-side adapter can dispatch
 * it and the profile module can handle it without a cross-module import. Carries
 * the optional profile details captured at sign-up; the handler is idempotent on
 * `userId`.
 */
export class ProvisionProfileCommand {
    constructor(
        public readonly userId: string,
        /** Generation seed for the handle when none is chosen (e.g. Google). */
        public readonly email: string,
        /** The user's chosen handle; omitted for Google (then auto-generated). */
        public readonly username?: string,
        public readonly firstName?: string | null,
        public readonly lastName?: string | null,
        public readonly birthDate?: string | null,
        public readonly heightCm?: number | null,
    ) {}
}
