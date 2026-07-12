import type { QueryBus } from '@nestjs/cqrs'
import { describe, expect, it } from 'vitest'

import { FakeInviteTokenGenerator, InMemoryCoachInvitationRepository } from '../../../../../../tests/doubles/coaching'
import { FakeUserDirectory } from '../../../../../../tests/doubles/shared'
import { CoachInvitationMother } from '../../../../../../tests/mothers/coaching'
import { FindUserIdByHandleQuery } from '../../../../../shared/contracts/find-user-id-by-handle.query'
import { GetCoachInvitationPreviewHandler } from './get-coach-invitation-preview.handler'
import { GetCoachInvitationPreviewQuery } from './get-coach-invitation-preview.query'

const TOKEN = 'the-token'

function setup(takenHandles: string[] = []) {
    const tokens = new FakeInviteTokenGenerator()
    const invitations = new InMemoryCoachInvitationRepository([
        CoachInvitationMother.create()
            .byCoach('coach-1')
            .withEmail('newbie@example.com')
            .forAthlete(null)
            .withTokenHash(tokens.hash(TOKEN))
            .build(),
    ])
    const directory = new FakeUserDirectory().seed('coach-1', { email: 'coach@example.com', username: 'coachy' })

    const taken = new Set(takenHandles)
    const queryBus = {
        execute: (query: FindUserIdByHandleQuery) => Promise.resolve(taken.has(query.handle) ? 'some-user' : null),
    } as unknown as QueryBus

    const handler = new GetCoachInvitationPreviewHandler(invitations, directory, tokens, queryBus)
    return { handler }
}

describe('GetCoachInvitationPreviewHandler', () => {
    it('resolves a pending token to email, coach and an available suggested handle', async () => {
        const { handler } = setup()

        const preview = await handler.execute(new GetCoachInvitationPreviewQuery(TOKEN))

        expect(preview).toEqual({
            email: 'newbie@example.com',
            coachUsername: 'coachy',
            suggestedUsername: 'newbie',
        })
    })

    it('bumps the suggested handle when the base is already taken', async () => {
        const { handler } = setup(['newbie'])

        const preview = await handler.execute(new GetCoachInvitationPreviewQuery(TOKEN))

        expect(preview?.suggestedUsername).toBe('newbie2')
    })

    it('returns null for an unknown token', async () => {
        const { handler } = setup()

        expect(await handler.execute(new GetCoachInvitationPreviewQuery('wrong'))).toBeNull()
    })
})
