import { describe, expect, it } from 'vitest'

import { InvalidInvitationStateError } from '../errors/coaching.errors'
import { CoachInvitationEntity } from './coach-invitation.entity'

const NOW = new Date('2026-03-01T10:00:00.000Z')
const LATER = new Date('2026-03-02T10:00:00.000Z')

function pending(): CoachInvitationEntity {
    return CoachInvitationEntity.create({
        id: 'i-1',
        coachId: 'c-1',
        email: 'a-1@example.com',
        athleteId: 'a-1',
        now: NOW,
    })
}

describe('CoachInvitationEntity', () => {
    it('starts pending', () => {
        const inv = pending()
        expect(inv.status).toBe('pending')
        expect(inv.isPending()).toBe(true)
    })

    it('accepts, declines or cancels from pending and bumps updatedAt', () => {
        const accepted = pending()
        accepted.accept(LATER)
        expect(accepted.status).toBe('accepted')
        expect(accepted.updatedAt).toBe(LATER)

        const declined = pending()
        declined.decline(LATER)
        expect(declined.status).toBe('declined')

        const cancelled = pending()
        cancelled.cancel(LATER)
        expect(cancelled.status).toBe('cancelled')
    })

    it('rejects a transition from a terminal state', () => {
        const inv = pending()
        inv.accept(LATER)

        expect(() => inv.decline(LATER)).toThrow(InvalidInvitationStateError)
        expect(() => inv.accept(LATER)).toThrow(InvalidInvitationStateError)
        expect(() => inv.cancel(LATER)).toThrow(InvalidInvitationStateError)
    })

    it('links a registering athlete only while unresolved', () => {
        const inv = CoachInvitationEntity.create({ id: 'i-2', coachId: 'c-1', email: 'a@example.com', now: NOW })
        expect(inv.athleteId).toBeNull()

        inv.linkAthlete('a-9', LATER)
        expect(inv.athleteId).toBe('a-9')

        // Idempotent: a second link never overwrites the bound athlete.
        inv.linkAthlete('a-other', LATER)
        expect(inv.athleteId).toBe('a-9')
    })
})
