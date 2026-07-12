import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { NotYourCoachError } from '../../../domain/errors/coaching.errors'
import { CoachUnlinker } from '../../services/coach-unlinker.service'
import { LeaveCoachCommand } from './leave-coach.command'

@CommandHandler(LeaveCoachCommand)
export class LeaveCoachHandler implements ICommandHandler<LeaveCoachCommand, boolean> {
    constructor(private readonly unlinker: CoachUnlinker) {}

    async execute(command: LeaveCoachCommand): Promise<boolean> {
        if (!(await this.unlinker.unlink(command.coachId, command.athleteId, 'athlete'))) {
            throw new NotYourCoachError()
        }

        return true
    }
}
