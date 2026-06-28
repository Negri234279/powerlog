import type { CoachInvitationEntity } from '../entities/coach-invitation.entity'

/**
 * Persistence port for coach invitations. `save` upserts (create + status
 * transitions). Lookups stay scoped where the caller needs ownership checks.
 */
export abstract class CoachInvitationRepository {
    abstract save(invitation: CoachInvitationEntity): Promise<void>
    abstract findById(id: string): Promise<CoachInvitationEntity | null>
    /** The pending invitation for this (coach, athlete) pair, if any. */
    abstract findPending(coachId: string, athleteId: string): Promise<CoachInvitationEntity | null>
    /** Pending invitations received by an athlete, newest first. */
    abstract listPendingForAthlete(athleteId: string): Promise<CoachInvitationEntity[]>
}
