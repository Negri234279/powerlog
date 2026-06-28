import { describe, expect, it } from 'vitest'

import { FakeClock, InMemoryCoachInvitationRepository } from '../../../../../../tests/doubles/coaching'
import { CoachInvitationMother } from '../../../../../../tests/mothers/coaching'
import { InvitationNotFoundError } from '../../../domain/errors/coaching.errors'
import { DeclineInvitationCommand } from './decline-invitation.command'
import { DeclineInvitationHandler } from './decline-invitation.handler'

function setup() {
    const invitations = new InMemoryCoachInvitationRepository([
        CoachInvitationMother.create().withId('inv-1').byCoach('coach-1').forAthlete('athlete-1').build(),
    ])
    return { handler: new DeclineInvitationHandler(invitations, new FakeClock()), invitations }
}

describe('DeclineInvitationHandler', () => {
    it('declines a pending invitation', async () => {
        const ctx = setup()

        const view = await ctx.handler.execute(new DeclineInvitationCommand('athlete-1', 'inv-1'))

        expect(view.status).toBe('declined')
    })

    it('hides invitations addressed to a different athlete behind not-found', async () => {
        const ctx = setup()

        await expect(ctx.handler.execute(new DeclineInvitationCommand('intruder', 'inv-1'))).rejects.toBeInstanceOf(
            InvitationNotFoundError,
        )
    })
})
