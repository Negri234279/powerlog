import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { NotYourAthleteError } from '../../../domain/errors/coaching.errors'
import { CoachUnlinker } from '../../services/coach-unlinker.service'
import { RemoveAthleteCommand } from './remove-athlete.command'

@CommandHandler(RemoveAthleteCommand)
export class RemoveAthleteHandler implements ICommandHandler<RemoveAthleteCommand, boolean> {
    constructor(private readonly unlinker: CoachUnlinker) {}

    async execute(command: RemoveAthleteCommand): Promise<boolean> {
        if (!(await this.unlinker.unlink(command.coachId, command.athleteId, 'coach'))) {
            throw new NotYourAthleteError()
        }

        return true
    }
}
