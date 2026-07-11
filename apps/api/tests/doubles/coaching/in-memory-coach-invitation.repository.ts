import type { CoachInvitationEntity } from '../../../src/modules/coaching/domain/entities/coach-invitation.entity'
import { CoachInvitationRepository } from '../../../src/modules/coaching/domain/repositories/coach-invitation.repository'

/**
 * In-memory CoachInvitationRepository implementing the real abstract interface.
 * Stores invitations by id; `save` upserts.
 */
export class InMemoryCoachInvitationRepository extends CoachInvitationRepository {
    private readonly byId = new Map<string, CoachInvitationEntity>()

    constructor(seed: CoachInvitationEntity[] = []) {
        super()
        for (const inv of seed) this.byId.set(inv.id, inv)
    }

    async save(invitation: CoachInvitationEntity): Promise<void> {
        this.byId.set(invitation.id, invitation)
    }

    async findById(id: string): Promise<CoachInvitationEntity | null> {
        return this.byId.get(id) ?? null
    }

    async findPendingByEmail(coachId: string, email: string): Promise<CoachInvitationEntity | null> {
        for (const inv of this.byId.values()) {
            if (inv.coachId === coachId && inv.email === email && inv.status === 'pending') return inv
        }
        return null
    }

    async listPendingByEmail(email: string): Promise<CoachInvitationEntity[]> {
        return [...this.byId.values()]
            .filter((inv) => inv.email === email && inv.status === 'pending')
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    }

    async listPendingForAthlete(athleteId: string): Promise<CoachInvitationEntity[]> {
        return [...this.byId.values()]
            .filter((inv) => inv.athleteId === athleteId && inv.status === 'pending')
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    }

    /** Test inspection: every stored invitation. */
    all(): CoachInvitationEntity[] {
        return [...this.byId.values()]
    }
}
