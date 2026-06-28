import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    InMemoryCoachInvitationRepository,
    InMemoryCoachLinkRepository,
} from '../../../../../../tests/doubles/coaching'
import { CoachInvitationMother } from '../../../../../../tests/mothers/coaching'
import { InvalidInvitationStateError, InvitationNotFoundError } from '../../../domain/errors/coaching.errors'
import { AcceptInvitationCommand } from './accept-invitation.command'
import { AcceptInvitationHandler } from './accept-invitation.handler'

const COACH = 'coach-1'
const ATHLETE = 'athlete-1'

function setup() {
    const invitations = new InMemoryCoachInvitationRepository([
        CoachInvitationMother.create().withId('inv-1').byCoach(COACH).forAthlete(ATHLETE).build(),
    ])
    const links = new InMemoryCoachLinkRepository()
    const handler = new AcceptInvitationHandler(invitations, links, new FakeClock())
    return { handler, invitations, links }
}

describe('AcceptInvitationHandler', () => {
    let ctx: ReturnType<typeof setup>
    beforeEach(() => {
        ctx = setup()
    })

    it('accepts a pending invitation and creates the coach link', async () => {
        const view = await ctx.handler.execute(new AcceptInvitationCommand(ATHLETE, 'inv-1'))

        expect(view.status).toBe('accepted')
        expect(await ctx.links.areLinked(COACH, ATHLETE)).toBe(true)
    })

    it('hides invitations addressed to a different athlete behind not-found', async () => {
        await expect(ctx.handler.execute(new AcceptInvitationCommand('intruder', 'inv-1'))).rejects.toBeInstanceOf(
            InvitationNotFoundError,
        )
        expect(await ctx.links.areLinked(COACH, ATHLETE)).toBe(false)
    })

    it('rejects accepting a non-pending invitation', async () => {
        await ctx.handler.execute(new AcceptInvitationCommand(ATHLETE, 'inv-1'))

        await expect(ctx.handler.execute(new AcceptInvitationCommand(ATHLETE, 'inv-1'))).rejects.toBeInstanceOf(
            InvalidInvitationStateError,
        )
    })

    it('rejects an unknown invitation', async () => {
        await expect(ctx.handler.execute(new AcceptInvitationCommand(ATHLETE, 'missing'))).rejects.toBeInstanceOf(
            InvitationNotFoundError,
        )
    })
})
