import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { ExerciseNotFoundError } from '../../../domain/errors/workouts.errors'
import { ExerciseRepository } from '../../../domain/repositories/exercise.repository'
import { type ExerciseView, toExerciseView } from '../../queries/list-exercises/list-exercises.handler'
import { UpdateExerciseCommand } from './update-exercise.command'

@CommandHandler(UpdateExerciseCommand)
export class UpdateExerciseHandler implements ICommandHandler<UpdateExerciseCommand, ExerciseView> {
    constructor(private readonly exercises: ExerciseRepository) {}

    async execute(command: UpdateExerciseCommand): Promise<ExerciseView> {
        const exercise = await this.exercises.findById(command.exerciseId)
        if (!exercise) {
            throw new ExerciseNotFoundError()
        }

        exercise.update(command.patch)

        await this.exercises.update(exercise)

        return toExerciseView(exercise)
    }
}
