import { beforeEach, describe, expect, it } from 'vitest'

import {
    FakeClock,
    InMemoryCoachLinkRepository,
    InMemoryCoachNoteRepository,
} from '../../../../../../tests/doubles/coaching'
import { NotYourAthleteError } from '../../../domain/errors/coaching.errors'
import { SetAthleteNoteCommand } from './set-athlete-note.command'
import { SetAthleteNoteHandler } from './set-athlete-note.handler'

const COACH = 'coach-1'
const ATHLETE = 'athlete-1'

function setup() {
    const notes = new InMemoryCoachNoteRepository()
    const links = new InMemoryCoachLinkRepository()
    const handler = new SetAthleteNoteHandler(notes, links, new FakeClock())
    return { handler, notes, links }
}

describe('SetAthleteNoteHandler', () => {
    let ctx: ReturnType<typeof setup>
    beforeEach(() => {
        ctx = setup()
    })

    it('rejects noting an athlete who is not linked to the coach', async () => {
        await expect(
            ctx.handler.execute(new SetAthleteNoteCommand(COACH, ATHLETE, 'strong squats')),
        ).rejects.toBeInstanceOf(NotYourAthleteError)
        expect(await ctx.notes.get(COACH, ATHLETE)).toBeNull()
    })

    it('stores a trimmed note for a linked athlete', async () => {
        await ctx.links.link(COACH, ATHLETE, new Date())

        await ctx.handler.execute(new SetAthleteNoteCommand(COACH, ATHLETE, '  focus on depth  '))

        expect((await ctx.notes.get(COACH, ATHLETE))?.body).toBe('focus on depth')
    })

    it('clears the note when the body is empty', async () => {
        await ctx.links.link(COACH, ATHLETE, new Date())
        await ctx.handler.execute(new SetAthleteNoteCommand(COACH, ATHLETE, 'something'))

        await ctx.handler.execute(new SetAthleteNoteCommand(COACH, ATHLETE, '   '))

        expect(await ctx.notes.get(COACH, ATHLETE)).toBeNull()
    })
})
