import { CoachInvitationEntity } from '../../../domain/entities/coach-invitation.entity'
import type { coachAthleteInvitations } from '../schema/coach-athlete-invitations.schema'

type InvitationRow = typeof coachAthleteInvitations.$inferSelect

/** Maps the CoachInvitation entity to/from its `coach_athlete_invitations` row. */
export const CoachInvitationMapper = {
    toDomain(row: InvitationRow): CoachInvitationEntity {
        return CoachInvitationEntity.rehydrate({
            id: row.id,
            coachId: row.coachId,
            athleteId: row.athleteId,
            email: row.email,
            status: row.status,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        })
    },

    toPersistence(invitation: CoachInvitationEntity): typeof coachAthleteInvitations.$inferInsert {
        return {
            id: invitation.id,
            coachId: invitation.coachId,
            athleteId: invitation.athleteId,
            email: invitation.email,
            status: invitation.status,
            createdAt: invitation.createdAt,
            updatedAt: invitation.updatedAt,
        }
    },
}
