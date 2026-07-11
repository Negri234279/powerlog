import { CoachInvitationEntity } from '../../../src/modules/coaching/domain/entities/coach-invitation.entity'
import type { InvitationStatus } from '../../../src/modules/coaching/domain/invitation-status'

const DEFAULT_NOW = new Date('2026-01-01T00:00:00.000Z')

/**
 * Object Mother for coach invitations. Fluent builder with sane defaults:
 *   CoachInvitationMother.create().byCoach("c-1").forAthlete("a-1").build()
 */
export class CoachInvitationMother {
    private id = '88888888-8888-4888-8888-888888888888'
    private coachId = 'coach-1'
    private athleteId: string | null = 'athlete-1'
    private email = 'athlete-1@example.com'
    private status: InvitationStatus = 'pending'
    private createdAt = DEFAULT_NOW

    static create(): CoachInvitationMother {
        return new CoachInvitationMother()
    }

    withId(id: string): this {
        this.id = id
        return this
    }

    byCoach(coachId: string): this {
        this.coachId = coachId
        return this
    }

    forAthlete(athleteId: string | null): this {
        this.athleteId = athleteId
        return this
    }

    withEmail(email: string): this {
        this.email = email
        return this
    }

    withStatus(status: InvitationStatus): this {
        this.status = status
        return this
    }

    createdAtTime(at: Date): this {
        this.createdAt = at
        return this
    }

    build(): CoachInvitationEntity {
        return CoachInvitationEntity.rehydrate({
            id: this.id,
            coachId: this.coachId,
            athleteId: this.athleteId,
            email: this.email,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.createdAt,
        })
    }
}
