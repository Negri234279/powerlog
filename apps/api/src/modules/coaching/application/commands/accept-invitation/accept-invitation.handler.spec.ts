import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    InMemoryCoachInvitationRepository,
    InMemoryCoachLinkRepository,
} from '../../../../../../tests/doubles/coaching'
import { FakeUserDirectory, RecordingEventBus } from '../../../../../../tests/doubles/shared'
import { CoachInvitationMother } from '../../../../../../tests/mothers/coaching'
import { CoachLinkEstablishedIntegrationEvent } from '../../../../../shared/integration-events/coach-link-established.integration-event'
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
    const directory = new FakeUserDirectory()
        .seed(COACH, { email: 'coach@example.com', username: 'coachy' })
        .seed(ATHLETE, { email: 'athlete@example.com', username: 'athletey' })
    const events = new RecordingEventBus()
    const handler = new AcceptInvitationHandler(invitations, links, directory, new FakeClock(), events.asEventBus())
    return { handler, invitations, links, events }
}

describe('AcceptInvitationHandler', () => {
    let ctx: ReturnType<typeof setup>
    beforeEach(() => {
        ctx = setup()
    })

    it('accepts a pending invitation, creates the link and announces it', async () => {
        const view = await ctx.handler.execute(new AcceptInvitationCommand(ATHLETE, 'inv-1'))

        expect(view.status).toBe('accepted')
        expect(await ctx.links.areLinked(COACH, ATHLETE)).toBe(true)

        const event = ctx.events.firstOf(CoachLinkEstablishedIntegrationEvent)
        expect(event).toMatchObject({
            coachId: COACH,
            athleteId: ATHLETE,
            coachUsername: 'coachy',
            athleteUsername: 'athletey',
        })
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
