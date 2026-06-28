import { describe, expect, it } from 'vitest'

import { InMemoryCoachInvitationRepository } from '../../../../../../tests/doubles/coaching'
import { FakeUserDirectory } from '../../../../../../tests/doubles/shared'
import { CoachInvitationMother } from '../../../../../../tests/mothers/coaching'
import { PendingInvitationsHandler } from './pending-invitations.handler'
import { PendingInvitationsQuery } from './pending-invitations.query'

describe('PendingInvitationsHandler', () => {
    it('lists the athlete’s pending invitations with the coach handle resolved', async () => {
        const invitations = new InMemoryCoachInvitationRepository([
            CoachInvitationMother.create().withId('inv-1').byCoach('coach-1').forAthlete('athlete-1').build(),
            // A declined one + one for another athlete must not show up.
            CoachInvitationMother.create()
                .withId('inv-2')
                .byCoach('coach-1')
                .forAthlete('athlete-1')
                .withStatus('declined')
                .build(),
            CoachInvitationMother.create().withId('inv-3').byCoach('coach-1').forAthlete('someone').build(),
        ])
        const directory = new FakeUserDirectory().seed('coach-1', { email: 'c1@example.com', username: 'coachone' })
        const handler = new PendingInvitationsHandler(invitations, directory)

        const result = await handler.execute(new PendingInvitationsQuery('athlete-1'))

        expect(result).toEqual([
            { id: 'inv-1', coachId: 'coach-1', coachUsername: 'coachone', createdAt: expect.any(Date) },
        ])
    })
})
