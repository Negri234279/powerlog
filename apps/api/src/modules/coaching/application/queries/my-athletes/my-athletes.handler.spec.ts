import { describe, expect, it } from 'vitest'

import { InMemoryCoachLinkRepository } from '../../../../../../tests/doubles/coaching'
import { FakeUserDirectory } from '../../../../../../tests/doubles/shared'
import { MyAthletesHandler } from './my-athletes.handler'
import { MyAthletesQuery } from './my-athletes.query'

describe('MyAthletesHandler', () => {
    it('resolves linked athletes to handles', async () => {
        const links = new InMemoryCoachLinkRepository()
        await links.link('coach-1', 'athlete-1', new Date('2026-01-01'))
        const directory = new FakeUserDirectory().seed('athlete-1', { email: 'a1@example.com', username: 'athleteone' })
        const handler = new MyAthletesHandler(links, directory)

        const result = await handler.execute(new MyAthletesQuery('coach-1'))

        expect(result).toEqual([{ userId: 'athlete-1', username: 'athleteone' }])
    })
})
