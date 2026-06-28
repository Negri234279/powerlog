import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { ExerciseRepository } from '../../../domain/repositories/exercise.repository'
import { WorkoutTemplateRepository } from '../../../domain/repositories/workout-template.repository'
import { Clock } from '../../ports/clock.port'
import { IdGenerator } from '../../ports/id-generator.port'
import {
    type WorkoutTemplateView,
    toWorkoutTemplateView,
} from '../../queries/get-workout-template/get-workout-template.handler'
import { requireOwnedTemplate } from '../../require-owned-template'
import { buildTemplateContent } from '../../template-content'
import { UpdateWorkoutTemplateCommand } from './update-workout-template.command'

@CommandHandler(UpdateWorkoutTemplateCommand)
export class UpdateWorkoutTemplateHandler implements ICommandHandler<
    UpdateWorkoutTemplateCommand,
    WorkoutTemplateView
> {
    constructor(
        private readonly templates: WorkoutTemplateRepository,
        private readonly exercises: ExerciseRepository,
        private readonly clock: Clock,
        private readonly ids: IdGenerator,
    ) {}

    async execute(command: UpdateWorkoutTemplateCommand): Promise<WorkoutTemplateView> {
        const template = await requireOwnedTemplate(this.templates, command.templateId, command.ownerId)
        const content = await buildTemplateContent(command.content, this.exercises)

        template.replaceContent(content, () => this.ids.uuid(), this.clock.now())

        await this.templates.save(template)

        return toWorkoutTemplateView(template)
    }
}
