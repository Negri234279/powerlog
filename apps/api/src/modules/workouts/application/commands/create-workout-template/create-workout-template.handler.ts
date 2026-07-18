import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { Entitlements } from '../../../../../shared/contracts/entitlements'
import { WorkoutTemplateAggregate } from '../../../domain/entities/workout-template.entity'
import { ExerciseRepository } from '../../../domain/repositories/exercise.repository'
import { WorkoutTemplateRepository } from '../../../domain/repositories/workout-template.repository'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import {
    type WorkoutTemplateView,
    toWorkoutTemplateView,
} from '../../queries/get-workout-template/get-workout-template.handler'
import { buildTemplateContent } from '../../template-content'
import { CreateWorkoutTemplateCommand } from './create-workout-template.command'

@CommandHandler(CreateWorkoutTemplateCommand)
export class CreateWorkoutTemplateHandler implements ICommandHandler<
    CreateWorkoutTemplateCommand,
    WorkoutTemplateView
> {
    constructor(
        private readonly templates: WorkoutTemplateRepository,
        private readonly exercises: ExerciseRepository,
        private readonly entitlements: Entitlements,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
    ) {}

    async execute(command: CreateWorkoutTemplateCommand): Promise<WorkoutTemplateView> {
        // Only creating is gated: a soft downgrade leaves what you already have
        // readable and editable, it just stops you making more.
        const owned = await this.templates.countByOwner(command.ownerId)
        await this.entitlements.assertWithinLimit(command.ownerId, 'athlete', 'templates', owned)

        const content = await buildTemplateContent(command.content, this.exercises)
        const template = WorkoutTemplateAggregate.create({
            id: this.ids.uuid(),
            ownerId: command.ownerId,
            content,
            idFactory: () => this.ids.uuid(),
            now: this.clock.now(),
        })

        await this.templates.save(template)

        return toWorkoutTemplateView(template)
    }
}
