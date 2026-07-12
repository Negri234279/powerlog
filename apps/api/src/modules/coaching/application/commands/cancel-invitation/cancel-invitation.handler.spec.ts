import { describe, expect, it } from 'vitest'

import {
    FakeClock,
    FakeCoachingMetrics,
    InMemoryCoachInvitationRepository,
} from '../../../../../../tests/doubles/coaching'
import { CoachInvitationMother } from '../../../../../../tests/mothers/coaching'
import { InvitationNotFoundError } from '../../../domain/errors/coaching.errors'
import { CancelInvitationCommand } from './cancel-invitation.command'
import { CancelInvitationHandler } from './cancel-invitation.handler'

function setup(invitation = CoachInvitationMother.create().withId('inv-1').byCoach('coach-1').forAthlete('athlete-1')) {
    const invitations = new InMemoryCoachInvitationRepository([invitation.build()])
    const metrics = new FakeCoachingMetrics()

    return { handler: new CancelInvitationHandler(invitations, new FakeClock(), metrics), invitations, metrics }
}

describe('CancelInvitationHandler', () => {
    it('cancels a pending invitation the coach sent', async () => {
        const ctx = setup()

        const view = await ctx.handler.execute(new CancelInvitationCommand('coach-1', 'inv-1'))

        expect(view.status).toBe('cancelled')
        expect(ctx.metrics.invitations).toEqual([{ outcome: 'cancelled', invitee: 'existing' }])
    })

    it('counts a cancelled invite to an address with no account as a "new" invitee', async () => {
        // athleteId = null → the invite went to an address with no account yet.
        const ctx = setup(CoachInvitationMother.create().withId('inv-1').byCoach('coach-1').forAthlete(null))

        await ctx.handler.execute(new CancelInvitationCommand('coach-1', 'inv-1'))

        expect(ctx.metrics.invitations).toEqual([{ outcome: 'cancelled', invitee: 'new' }])
    })

    it('hides invitations sent by a different coach behind not-found', async () => {
        const ctx = setup()

        await expect(ctx.handler.execute(new CancelInvitationCommand('intruder', 'inv-1'))).rejects.toBeInstanceOf(
            InvitationNotFoundError,
        )
    })
})
