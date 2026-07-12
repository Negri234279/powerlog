import type { CoachInvitationEntity } from '../entities/coach-invitation.entity'

/**
 * Persistence port for coach invitations. `save` upserts (create + status
 * transitions). Lookups stay scoped where the caller needs ownership checks.
 */
export abstract class CoachInvitationRepository {
    abstract save(invitation: CoachInvitationEntity): Promise<void>
    abstract findById(id: string): Promise<CoachInvitationEntity | null>
    /** The pending invitation from this coach to this email, if any. */
    abstract findPendingByEmail(coachId: string, email: string): Promise<CoachInvitationEntity | null>
    /** The pending invitation carrying this opaque-token hash (signup-link preview). */
    abstract findPendingByTokenHash(tokenHash: string): Promise<CoachInvitationEntity | null>
    /** Pending invitations addressed to an email, across coaches (for auto-link on
     *  registration), newest first. */
    abstract listPendingByEmail(email: string): Promise<CoachInvitationEntity[]>
    /** Pending invitations received by an athlete, newest first. */
    abstract listPendingForAthlete(athleteId: string): Promise<CoachInvitationEntity[]>
}
