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
    /** Real name, when the user filled it in. Shown to people they are linked to
     *  (a coach and their athlete), never to strangers. */
    firstName?: string | null
    lastName?: string | null
    /** Resolved avatar URL; null/absent → client shows initials/default. */
    avatarUrl?: string | null
}

export abstract class UserDirectory {
    /** Resolve a username (any case) to its user id, or null if unknown. */
    abstract findUserIdByUsername(username: string): Promise<string | null>

    /** Resolve an email (any case) to its user id, or null if no account has it. */
    abstract findUserIdByEmail(email: string): Promise<string | null>

    /** Fetch a user's contact details by id, or null if the user is gone. */
    abstract getContact(userId: string): Promise<UserContact | null>
}
