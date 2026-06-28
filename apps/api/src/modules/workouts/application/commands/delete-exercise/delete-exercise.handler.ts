import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { ExerciseInUseError, ExerciseNotFoundError } from '../../../domain/errors/workouts.errors'
import { ExerciseRepository } from '../../../domain/repositories/exercise.repository'
import { DeleteExerciseCommand } from './delete-exercise.command'

@CommandHandler(DeleteExerciseCommand)
export class DeleteExerciseHandler implements ICommandHandler<DeleteExerciseCommand, boolean> {
    constructor(private readonly exercises: ExerciseRepository) {}

    async execute(command: DeleteExerciseCommand): Promise<boolean> {
        const exercise = await this.exercises.findById(command.exerciseId)
        if (!exercise) {
            throw new ExerciseNotFoundError()
        }

        if ((await this.exercises.countReferences(command.exerciseId)) > 0) {
            throw new ExerciseInUseError()
        }

        await this.exercises.delete(command.exerciseId)

        return true
    }
}
