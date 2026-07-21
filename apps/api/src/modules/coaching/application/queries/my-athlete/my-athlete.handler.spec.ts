import { describe, expect, it } from 'vitest'

import { InMemoryCoachLinkRepository } from '../../../../../../tests/doubles/coaching'
import { FakeUserDirectory } from '../../../../../../tests/doubles/shared'
import { MyAthleteHandler } from './my-athlete.handler'
import { MyAthleteQuery } from './my-athlete.query'

describe('MyAthleteHandler', () => {
    it('resolves a linked athlete to their handle, real name and avatar', async () => {
        const links = new InMemoryCoachLinkRepository()
        await links.link('coach-1', 'athlete-1', new Date('2026-01-01'))
        const directory = new FakeUserDirectory().seed('athlete-1', {
            email: 'a1@example.com',
            username: 'athleteone',
            firstName: 'Ana',
            lastName: 'Ruiz',
            avatarUrl: 'https://cdn.test/a1.webp',
        })
        const handler = new MyAthleteHandler(links, directory)

        const result = await handler.execute(new MyAthleteQuery('coach-1', 'athlete-1'))

        expect(result).toEqual({
            userId: 'athlete-1',
            username: 'athleteone',
            firstName: 'Ana',
            lastName: 'Ruiz',
            avatarUrl: 'https://cdn.test/a1.webp',
        })
    })

    it('should_return_null_for_an_athlete_linked_to_a_different_coach', async () => {
        const links = new InMemoryCoachLinkRepository()
        await links.link('coach-2', 'athlete-1', new Date('2026-01-01'))
        const directory = new FakeUserDirectory().seed('athlete-1', {
            email: 'a1@example.com',
            username: 'athleteone',
        })
        const handler = new MyAthleteHandler(links, directory)

        const result = await handler.execute(new MyAthleteQuery('coach-1', 'athlete-1'))

        expect(result).toBeNull()
    })

    it('should_return_null_once_the_link_is_broken', async () => {
        const links = new InMemoryCoachLinkRepository()
        await links.link('coach-1', 'athlete-1', new Date('2026-01-01'))
        await links.unlink('coach-1', 'athlete-1')
        const directory = new FakeUserDirectory().seed('athlete-1', {
            email: 'a1@example.com',
            username: 'athleteone',
        })
        const handler = new MyAthleteHandler(links, directory)

        const result = await handler.execute(new MyAthleteQuery('coach-1', 'athlete-1'))

        expect(result).toBeNull()
    })

    it('should_return_null_for_a_linked_athlete_whose_account_is_gone', async () => {
        const links = new InMemoryCoachLinkRepository()
        await links.link('coach-1', 'athlete-1', new Date('2026-01-01'))
        const handler = new MyAthleteHandler(links, new FakeUserDirectory())

        const result = await handler.execute(new MyAthleteQuery('coach-1', 'athlete-1'))

        expect(result).toBeNull()
    })
})
