/** Aggregate coaching figures for the admin dashboard. */
export interface AdminCoachingStats {
    /** Active coach↔athlete links. */
    links: number
    /** Distinct coaches with at least one athlete. */
    activeCoaches: number
    /** Distinct athletes with at least one coach. */
    linkedAthletes: number
    /** Invitations awaiting a response. */
    pendingInvitations: number
}

export abstract class AdminCoachingStatsReadModel {
    abstract read(): Promise<AdminCoachingStats>
}
