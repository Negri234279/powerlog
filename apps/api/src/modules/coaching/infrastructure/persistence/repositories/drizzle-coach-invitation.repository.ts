import { Inject, Injectable } from '@nestjs/common'
import { and, desc, eq } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import type { CoachInvitationEntity } from '../../../domain/entities/coach-invitation.entity'
import { CoachInvitationRepository } from '../../../domain/repositories/coach-invitation.repository'
import { coachAthleteInvitations } from '../schema/coach-athlete-invitations.schema'
import { CoachInvitationMapper } from '../mappers/coach-invitation.mapper'

@Injectable()
export class DrizzleCoachInvitationRepository extends CoachInvitationRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async save(invitation: CoachInvitationEntity): Promise<void> {
        const row = CoachInvitationMapper.toPersistence(invitation)
        await this.db
            .insert(coachAthleteInvitations)
            .values(row)
            .onConflictDoUpdate({
                target: coachAthleteInvitations.id,
                set: { athleteId: row.athleteId, status: row.status, updatedAt: row.updatedAt },
            })
    }

    async findById(id: string): Promise<CoachInvitationEntity | null> {
        const [row] = await this.db
            .select()
            .from(coachAthleteInvitations)
            .where(eq(coachAthleteInvitations.id, id))
            .limit(1)
        return row ? CoachInvitationMapper.toDomain(row) : null
    }

    async findPendingByEmail(coachId: string, email: string): Promise<CoachInvitationEntity | null> {
        const [row] = await this.db
            .select()
            .from(coachAthleteInvitations)
            .where(
                and(
                    eq(coachAthleteInvitations.coachId, coachId),
                    eq(coachAthleteInvitations.email, email),
                    eq(coachAthleteInvitations.status, 'pending'),
                ),
            )
            .limit(1)
        return row ? CoachInvitationMapper.toDomain(row) : null
    }

    async findPendingByTokenHash(tokenHash: string): Promise<CoachInvitationEntity | null> {
        const [row] = await this.db
            .select()
            .from(coachAthleteInvitations)
            .where(and(eq(coachAthleteInvitations.tokenHash, tokenHash), eq(coachAthleteInvitations.status, 'pending')))
            .limit(1)
        return row ? CoachInvitationMapper.toDomain(row) : null
    }

    async listPendingByEmail(email: string): Promise<CoachInvitationEntity[]> {
        const rows = await this.db
            .select()
            .from(coachAthleteInvitations)
            .where(and(eq(coachAthleteInvitations.email, email), eq(coachAthleteInvitations.status, 'pending')))
            .orderBy(desc(coachAthleteInvitations.createdAt), desc(coachAthleteInvitations.id))
        return rows.map(CoachInvitationMapper.toDomain)
    }

    async listPendingForAthlete(athleteId: string): Promise<CoachInvitationEntity[]> {
        const rows = await this.db
            .select()
            .from(coachAthleteInvitations)
            .where(and(eq(coachAthleteInvitations.athleteId, athleteId), eq(coachAthleteInvitations.status, 'pending')))
            .orderBy(desc(coachAthleteInvitations.createdAt), desc(coachAthleteInvitations.id))
        return rows.map(CoachInvitationMapper.toDomain)
    }
}
