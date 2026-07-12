import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { CoachLinks } from '../../../../../shared/contracts/coach-links'
import { ExerciseNotFoundError } from '../../../domain/errors/workouts.errors'
import { ExerciseRepository } from '../../../domain/repositories/exercise.repository'
import { WorkoutSessionRepository } from '../../../domain/repositories/workout-session.repository'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import {
    type WorkoutSessionView,
    toWorkoutSessionView,
} from '../../queries/get-workout-session/get-workout-session.handler'
import { requireManageableSession } from '../../require-manageable-session'
import { AddExerciseEntryCommand } from './add-exercise-entry.command'

@CommandHandler(AddExerciseEntryCommand)
export class AddExerciseEntryHandler implements ICommandHandler<AddExerciseEntryCommand, WorkoutSessionView> {
    constructor(
        private readonly sessions: WorkoutSessionRepository,
        private readonly coachLinks: CoachLinks,
        private readonly exercises: ExerciseRepository,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
    ) {}

    async execute(command: AddExerciseEntryCommand): Promise<WorkoutSessionView> {
        const exercise = await this.exercises.findById(command.exerciseId)
        if (!exercise) {
            throw new ExerciseNotFoundError()
        }

        const session = await requireManageableSession(
            this.sessions,
            this.coachLinks,
            command.sessionId,
            command.userId,
        )
        session.addEntry(
            { id: this.ids.uuid(), exerciseId: command.exerciseId, notes: command.notes ?? null },
            this.clock.now(),
        )

        await this.sessions.save(session)

        return toWorkoutSessionView(session)
    }
}
