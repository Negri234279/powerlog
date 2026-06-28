import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    FakeIdGenerator,
    InMemoryCoachInvitationRepository,
    InMemoryCoachLinkRepository,
} from '../../../../../../tests/doubles/coaching'
import { FakeUserDirectory, RecordingEventBus } from '../../../../../../tests/doubles/shared'
import { CoachInvitationMother } from '../../../../../../tests/mothers/coaching'
import { CoachInvitationCreatedIntegrationEvent } from '../../../../../shared/integration-events/coach-invitation-created.integration-event'
import {
    AlreadyLinkedError,
    AthleteNotFoundError,
    CannotInviteSelfError,
    InvitationAlreadyPendingError,
} from '../../../domain/errors/coaching.errors'
import { InviteAthleteCommand } from './invite-athlete.command'
import { InviteAthleteHandler } from './invite-athlete.handler'

const COACH = 'coach-1'
const ATHLETE = 'athlete-1'

function setup() {
    const invitations = new InMemoryCoachInvitationRepository()
    const links = new InMemoryCoachLinkRepository()
    const directory = new FakeUserDirectory()
        .seed(COACH, { email: 'coach@example.com', username: 'coachy' })
        .seed(ATHLETE, { email: 'athlete@example.com', username: 'athletey' })
    const events = new RecordingEventBus()
    const handler = new InviteAthleteHandler(
        invitations,
        links,
        directory,
        new FakeClock(),
        new FakeIdGenerator(['inv-1']),
        events.asEventBus(),
    )
    return { handler, invitations, links, events }
}

describe('InviteAthleteHandler', () => {
    let ctx: ReturnType<typeof setup>
    beforeEach(() => {
        ctx = setup()
    })

    it('creates a pending invitation and publishes the integration event', async () => {
        const view = await ctx.handler.execute(new InviteAthleteCommand(COACH, 'athletey'))

        expect(view).toMatchObject({ id: 'inv-1', coachId: COACH, athleteId: ATHLETE, status: 'pending' })
        expect(ctx.invitations.all()).toHaveLength(1)

        const event = ctx.events.firstOf(CoachInvitationCreatedIntegrationEvent)
        expect(event).toMatchObject({
            invitationId: 'inv-1',
            coachId: COACH,
            athleteId: ATHLETE,
            coachUsername: 'coachy',
        })
    })

    it('rejects an unknown username', async () => {
        await expect(ctx.handler.execute(new InviteAthleteCommand(COACH, 'ghost'))).rejects.toBeInstanceOf(
            AthleteNotFoundError,
        )
    })

    it('rejects inviting yourself', async () => {
        await expect(ctx.handler.execute(new InviteAthleteCommand(COACH, 'coachy'))).rejects.toBeInstanceOf(
            CannotInviteSelfError,
        )
    })

    it('rejects when already linked', async () => {
        await ctx.links.link(COACH, ATHLETE, new Date())

        await expect(ctx.handler.execute(new InviteAthleteCommand(COACH, 'athletey'))).rejects.toBeInstanceOf(
            AlreadyLinkedError,
        )
    })

    it('rejects when a pending invitation already exists', async () => {
        await ctx.invitations.save(CoachInvitationMother.create().byCoach(COACH).forAthlete(ATHLETE).build())

        await expect(ctx.handler.execute(new InviteAthleteCommand(COACH, 'athletey'))).rejects.toBeInstanceOf(
            InvitationAlreadyPendingError,
        )
    })
})
