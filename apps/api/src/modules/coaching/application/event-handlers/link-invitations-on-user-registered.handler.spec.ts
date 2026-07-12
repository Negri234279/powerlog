import { describe, expect, it } from 'vitest'

import {
    FakeClock,
    InMemoryCoachInvitationRepository,
    InMemoryCoachLinkRepository,
} from '../../../../../tests/doubles/coaching'
import { FakeUserDirectory, RecordingEventBus } from '../../../../../tests/doubles/shared'
import { CoachInvitationMother } from '../../../../../tests/mothers/coaching'
import { CoachLinkEstablishedIntegrationEvent } from '../../../../shared/integration-events/coach-link-established.integration-event'
import { UserRegisteredIntegrationEvent } from '../../../../shared/integration-events/user-registered.integration-event'
import type { CoachInvitationEntity } from '../../domain/entities/coach-invitation.entity'
import { LinkInvitationsOnUserRegistered } from './link-invitations-on-user-registered.handler'

const COACH = 'coach-1'
const NEW_USER = 'new-user-1'
const EMAIL = 'newbie@example.com'

function setup(seed: CoachInvitationEntity[]) {
    const invitations = new InMemoryCoachInvitationRepository(seed)
    const links = new InMemoryCoachLinkRepository()
    const directory = new FakeUserDirectory()
        .seed(COACH, { email: 'coach@example.com', username: 'coachy' })
        .seed(NEW_USER, { email: EMAIL, username: 'newbie' })
    const events = new RecordingEventBus()
    const handler = new LinkInvitationsOnUserRegistered(
        invitations,
        links,
        directory,
        new FakeClock(),
        events.asEventBus(),
    )
    return { handler, invitations, links, events }
}

const REGISTERED = new UserRegisteredIntegrationEvent(NEW_USER, EMAIL, 'password')

describe('LinkInvitationsOnUserRegistered', () => {
    let ctx: ReturnType<typeof setup>

    it('auto-links an email-only invitation and announces the link', async () => {
        const invitation = CoachInvitationMother.create()
            .withId('inv-1')
            .byCoach(COACH)
            .withEmail(EMAIL)
            .forAthlete(null)
            .build()
        ctx = setup([invitation])

        await ctx.handler.handle(REGISTERED)

        const saved = await ctx.invitations.findById('inv-1')
        expect(saved?.status).toBe('accepted')
        expect(saved?.athleteId).toBe(NEW_USER)
        expect(await ctx.links.areLinked(COACH, NEW_USER)).toBe(true)
        expect(ctx.events.firstOf(CoachLinkEstablishedIntegrationEvent)).toMatchObject({
            coachId: COACH,
            athleteId: NEW_USER,
            athleteUsername: 'newbie',
        })
    })

    it('leaves invitations already bound to a registered user untouched', async () => {
        const invitation = CoachInvitationMother.create()
            .withId('inv-2')
            .byCoach(COACH)
            .withEmail(EMAIL)
            .forAthlete('someone-else')
            .build()
        ctx = setup([invitation])

        await ctx.handler.handle(REGISTERED)

        expect((await ctx.invitations.findById('inv-2'))?.status).toBe('pending')
        expect(await ctx.links.areLinked(COACH, NEW_USER)).toBe(false)
    })

    it('is a no-op when no invitation targets the email', async () => {
        ctx = setup([])

        await ctx.handler.handle(REGISTERED)

        expect(await ctx.links.athleteIdsOf(COACH)).toEqual([])
    })
})
