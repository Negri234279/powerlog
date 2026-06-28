/**
 * Cross-module contract for provisioning a user's profile synchronously during
 * registration, without the auth module importing the profile module. The
 * implementation dispatches a `ProvisionProfileCommand` over the CommandBus
 * (which propagates failures, unlike the fire-and-forget `UserRegistered`
 * event), so the register flow can compensate — delete the user — when profile
 * creation fails. Lives in the shared kernel so neither side crosses a module
 * boundary.
 */
export interface ProfileProvisionInput {
    userId: string
    /** Used as the generation seed when no handle is supplied (e.g. Google). */
    email: string
    /**
     * The user's chosen handle (becomes the display name). Omitted for Google
     * sign-ups, where the profile module generates a unique one from `email`.
     */
    username?: string
    firstName?: string | null
    lastName?: string | null
    /** Calendar date as YYYY-MM-DD. */
    birthDate?: string | null
    /** Whole centimetres. */
    heightCm?: number | null
}

export abstract class ProfileProvisioner {
    abstract provision(input: ProfileProvisionInput): Promise<void>
}
