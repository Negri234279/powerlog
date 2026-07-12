import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { NotYourAthleteError } from '../../../domain/errors/coaching.errors'
import { CoachLinkRepository } from '../../../domain/repositories/coach-link.repository'
import { CoachNoteRepository } from '../../../domain/repositories/coach-note.repository'
import { Clock } from '../../ports/clock.port'
import { SetAthleteNoteCommand } from './set-athlete-note.command'

@CommandHandler(SetAthleteNoteCommand)
export class SetAthleteNoteHandler implements ICommandHandler<SetAthleteNoteCommand, void> {
    constructor(
        private readonly notes: CoachNoteRepository,
        private readonly links: CoachLinkRepository,
        private readonly clock: Clock,
    ) {}

    async execute(command: SetAthleteNoteCommand): Promise<void> {
        // Only a linked coach may note an athlete.
        if (!(await this.links.areLinked(command.coachId, command.athleteId))) {
            throw new NotYourAthleteError()
        }

        const body = command.body.trim()
        if (body === '') {
            await this.notes.clear(command.coachId, command.athleteId)
            return
        }

        await this.notes.upsert(command.coachId, command.athleteId, body, this.clock.now())
    }
}
