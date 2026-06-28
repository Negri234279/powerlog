import { describe, expect, it } from 'vitest'

import { FakeClock, InMemoryCoachInvitationRepository } from '../../../../../../tests/doubles/coaching'
import { CoachInvitationMother } from '../../../../../../tests/mothers/coaching'
import { InvitationNotFoundError } from '../../../domain/errors/coaching.errors'
import { CancelInvitationCommand } from './cancel-invitation.command'
import { CancelInvitationHandler } from './cancel-invitation.handler'

function setup() {
    const invitations = new InMemoryCoachInvitationRepository([
        CoachInvitationMother.create().withId('inv-1').byCoach('coach-1').forAthlete('athlete-1').build(),
    ])
    return { handler: new CancelInvitationHandler(invitations, new FakeClock()), invitations }
}

describe('CancelInvitationHandler', () => {
    it('cancels a pending invitation the coach sent', async () => {
        const ctx = setup()

        const view = await ctx.handler.execute(new CancelInvitationCommand('coach-1', 'inv-1'))

        expect(view.status).toBe('cancelled')
    })

    it('hides invitations sent by a different coach behind not-found', async () => {
        const ctx = setup()

        await expect(ctx.handler.execute(new CancelInvitationCommand('intruder', 'inv-1'))).rejects.toBeInstanceOf(
            InvitationNotFoundError,
        )
    })
})
