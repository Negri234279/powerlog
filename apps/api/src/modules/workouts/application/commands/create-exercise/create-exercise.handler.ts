import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { ExerciseEntity } from '../../../domain/entities/exercise.entity'
import { ExerciseSlugTakenError } from '../../../domain/errors/workouts.errors'
import { ExerciseRepository } from '../../../domain/repositories/exercise.repository'
import { IdGenerator } from '../../ports/id-generator.port'
import { type ExerciseView, toExerciseView } from '../../queries/list-exercises/list-exercises.handler'
import { CreateExerciseCommand } from './create-exercise.command'

@CommandHandler(CreateExerciseCommand)
export class CreateExerciseHandler implements ICommandHandler<CreateExerciseCommand, ExerciseView> {
    constructor(
        private readonly exercises: ExerciseRepository,
        private readonly ids: IdGenerator,
    ) {}

    async execute(command: CreateExerciseCommand): Promise<ExerciseView> {
        const slug = command.slug?.trim() || ExerciseEntity.slugFrom(command.name)
        if (await this.exercises.findBySlug(slug)) {
            throw new ExerciseSlugTakenError()
        }

        const exercise = ExerciseEntity.create({
            id: this.ids.uuid(),
            slug,
            name: command.name,
            category: command.category,
            equipment: command.equipment,
            primaryMuscle: command.primaryMuscle,
        })

        await this.exercises.insert(exercise)

        const nameEs = command.nameEs?.trim()
        if (nameEs) {
            await this.exercises.upsertTranslation(exercise.id, 'es', nameEs)
        }

        return toExerciseView(exercise)
    }
}
