import { describe, expect, it } from 'vitest'

import { InMemoryCoachNoteRepository } from '../../../../../../tests/doubles/coaching'
import { GetAthleteNoteHandler } from './get-athlete-note.handler'
import { GetAthleteNoteQuery } from './get-athlete-note.query'

const COACH = 'coach-1'
const ATHLETE = 'athlete-1'

describe('GetAthleteNoteHandler', () => {
    it('returns null when the coach has no note on the athlete', async () => {
        const handler = new GetAthleteNoteHandler(new InMemoryCoachNoteRepository())

        expect(await handler.execute(new GetAthleteNoteQuery(COACH, ATHLETE))).toBeNull()
    })

    it('returns the stored note', async () => {
        const notes = new InMemoryCoachNoteRepository()
        const now = new Date('2026-05-01T00:00:00.000Z')
        await notes.upsert(COACH, ATHLETE, 'peaking block', now)

        const handler = new GetAthleteNoteHandler(notes)

        expect(await handler.execute(new GetAthleteNoteQuery(COACH, ATHLETE))).toEqual({
            body: 'peaking block',
            updatedAt: now,
        })
    })
})
