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

        // `undefined` = leave the Spanish name untouched; empty = clear it; else upsert.
        if (command.nameEs !== undefined) {
            const nameEs = command.nameEs?.trim() ?? ''
            if (nameEs) {
                await this.exercises.upsertTranslation(exercise.id, 'es', nameEs)
            } else {
                await this.exercises.deleteTranslation(exercise.id, 'es')
            }
        }

        return toExerciseView(exercise)
    }
}
