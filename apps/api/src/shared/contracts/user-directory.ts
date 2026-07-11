/**
 * Cross-module contract for resolving users without importing the auth module.
 * The auth module provides the implementation and exports it; other modules
 * (notifications, coaching) depend on this abstract class via DI. Keep it
 * minimal — only what cross-cutting features genuinely need.
 */

/** Contact details for a user, used by notifications/coaching. */
export interface UserContact {
    email: string
    username: string
}

export abstract class UserDirectory {
    /** Resolve a username (any case) to its user id, or null if unknown. */
    abstract findUserIdByUsername(username: string): Promise<string | null>

    /** Resolve an email (any case) to its user id, or null if no account has it. */
    abstract findUserIdByEmail(email: string): Promise<string | null>

    /** Fetch a user's contact details by id, or null if the user is gone. */
    abstract getContact(userId: string): Promise<UserContact | null>
}
