import { describe, expect, it } from 'vitest'

import { InMemoryCoachLinkRepository } from '../../../../../../tests/doubles/coaching'
import { FakeUserDirectory } from '../../../../../../tests/doubles/shared'
import { MyCoachesHandler } from './my-coaches.handler'
import { MyCoachesQuery } from './my-coaches.query'

describe('MyCoachesHandler', () => {
    it('resolves linked coaches to handles and drops ones that no longer exist', async () => {
        const links = new InMemoryCoachLinkRepository()
        await links.link('coach-1', 'athlete-1', new Date('2026-01-01'))
        await links.link('coach-gone', 'athlete-1', new Date('2026-01-02'))
        const directory = new FakeUserDirectory().seed('coach-1', { email: 'c1@example.com', username: 'coachone' })
        const handler = new MyCoachesHandler(links, directory)

        const result = await handler.execute(new MyCoachesQuery('athlete-1'))

        // coach-gone has no contact → dropped; coach-1 resolved.
        expect(result).toEqual([{ userId: 'coach-1', username: 'coachone' }])
    })
})
