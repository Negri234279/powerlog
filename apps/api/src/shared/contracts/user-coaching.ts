/**
 * Cross-module read contract: a user's coaching relationships as an admin needs
 * to see them — the coaches over them and the athletes under them — without
 * importing the coaching module. Coaching provides the implementation and
 * dispatches over the QueryBus.
 */

/** A linked user resolved to their public card. */
export interface CoachingUserCard {
    userId: string
    username: string
    firstName: string | null
    lastName: string | null
    avatarUrl: string | null
}

export interface UserCoachingSummary {
    /** Coaches who coach this user (usually zero or one). */
    coaches: CoachingUserCard[]
    /** How many athletes this user coaches — the true total. */
    athleteCount: number
    /**
     * A bounded sample of those athletes (newest link first). Capped so a coach
     * with hundreds of athletes doesn't turn one admin lookup into hundreds of
     * identity resolutions; `athleteCount` is the honest number.
     */
    athletes: CoachingUserCard[]
}

export abstract class UserCoachingReader {
    abstract read(userId: string): Promise<UserCoachingSummary>
}
