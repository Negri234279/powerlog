import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    FakeIdGenerator,
    FakeInviteTokenGenerator,
    InMemoryCoachInvitationRepository,
    InMemoryCoachLinkRepository,
} from '../../../../../../tests/doubles/coaching'
import { FakeEntitlements, FakeUserDirectory, RecordingEventBus } from '../../../../../../tests/doubles/shared'
import { CoachInvitationMother } from '../../../../../../tests/mothers/coaching'
import { CoachInvitationCreatedIntegrationEvent } from '../../../../../shared/integration-events/coach-invitation-created.integration-event'
import {
    AlreadyLinkedError,
    CannotInviteSelfError,
    InvitationAlreadyPendingError,
} from '../../../domain/errors/coaching.errors'
import { InviteAthleteCommand } from './invite-athlete.command'
import { InviteAthleteHandler } from './invite-athlete.handler'

const COACH = 'coach-1'
const ATHLETE = 'athlete-1'
const ATHLETE_EMAIL = 'athlete@example.com'

function setup() {
    const invitations = new InMemoryCoachInvitationRepository()
    const links = new InMemoryCoachLinkRepository()
    const directory = new FakeUserDirectory()
        .seed(COACH, { email: 'coach@example.com', username: 'coachy' })
        .seed(ATHLETE, { email: ATHLETE_EMAIL, username: 'athletey' })
    const entitlements = new FakeEntitlements()
    const events = new RecordingEventBus()
    const handler = new InviteAthleteHandler(
        invitations,
        links,
        directory,
        entitlements,
        new FakeClock(),
        new FakeIdGenerator(['inv-1']),
        new FakeInviteTokenGenerator(),
        events.asEventBus(),
    )
    return { handler, invitations, links, entitlements, events }
}

describe('InviteAthleteHandler', () => {
    let ctx: ReturnType<typeof setup>
    beforeEach(() => {
        ctx = setup()
    })

    it('invites a registered athlete by email and publishes the event', async () => {
        const view = await ctx.handler.execute(new InviteAthleteCommand(COACH, ATHLETE_EMAIL))

        expect(view).toMatchObject({ id: 'inv-1', coachId: COACH, athleteId: ATHLETE, email: ATHLETE_EMAIL })
        expect(ctx.invitations.all()).toHaveLength(1)

        const event = ctx.events.firstOf(CoachInvitationCreatedIntegrationEvent)
        expect(event).toMatchObject({
            invitationId: 'inv-1',
            coachId: COACH,
            athleteId: ATHLETE,
            email: ATHLETE_EMAIL,
            token: 'raw-1',
        })
        // Only the token's hash is persisted, never the raw token.
        expect(ctx.invitations.all()[0]?.tokenHash).toBe('hash(raw-1)')
    })

    it('invites a not-yet-registered email with a null athleteId', async () => {
        const view = await ctx.handler.execute(new InviteAthleteCommand(COACH, 'stranger@example.com'))

        expect(view).toMatchObject({ athleteId: null, email: 'stranger@example.com', status: 'pending' })
        const event = ctx.events.firstOf(CoachInvitationCreatedIntegrationEvent)
        expect(event).toMatchObject({ athleteId: null, email: 'stranger@example.com' })
    })

    it('normalizes the email (trim + lowercase)', async () => {
        const view = await ctx.handler.execute(new InviteAthleteCommand(COACH, '  Athlete@Example.com '))
        expect(view.email).toBe(ATHLETE_EMAIL)
        expect(view.athleteId).toBe(ATHLETE)
    })

    it('rejects inviting your own email', async () => {
        await expect(ctx.handler.execute(new InviteAthleteCommand(COACH, 'coach@example.com'))).rejects.toBeInstanceOf(
            CannotInviteSelfError,
        )
    })

    it('rejects when already linked', async () => {
        await ctx.links.link(COACH, ATHLETE, new Date())

        await expect(ctx.handler.execute(new InviteAthleteCommand(COACH, ATHLETE_EMAIL))).rejects.toBeInstanceOf(
            AlreadyLinkedError,
        )
    })

    it('rejects when a pending invitation already exists for that email', async () => {
        await ctx.invitations.save(
            CoachInvitationMother.create().byCoach(COACH).withEmail(ATHLETE_EMAIL).forAthlete(ATHLETE).build(),
        )

        await expect(ctx.handler.execute(new InviteAthleteCommand(COACH, ATHLETE_EMAIL))).rejects.toBeInstanceOf(
            InvitationAlreadyPendingError,
        )
    })

    it('enforces the plan athlete limit via entitlements', async () => {
        ctx.entitlements.denyAddAthlete(new Error('athlete limit reached'))

        await expect(ctx.handler.execute(new InviteAthleteCommand(COACH, ATHLETE_EMAIL))).rejects.toThrow(
            'athlete limit reached',
        )
        expect(ctx.invitations.all()).toHaveLength(0)
    })
})
