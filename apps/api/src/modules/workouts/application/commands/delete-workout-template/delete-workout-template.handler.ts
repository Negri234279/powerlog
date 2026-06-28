import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { WorkoutTemplateRepository } from '../../../domain/repositories/workout-template.repository'
import { requireOwnedTemplate } from '../../require-owned-template'
import { DeleteWorkoutTemplateCommand } from './delete-workout-template.command'

@CommandHandler(DeleteWorkoutTemplateCommand)
export class DeleteWorkoutTemplateHandler implements ICommandHandler<DeleteWorkoutTemplateCommand, boolean> {
    constructor(private readonly templates: WorkoutTemplateRepository) {}

    async execute(command: DeleteWorkoutTemplateCommand): Promise<boolean> {
        // Asserts ownership before deleting (cascade removes exercises + sets).
        await requireOwnedTemplate(this.templates, command.templateId, command.ownerId)

        await this.templates.delete(command.templateId)

        return true
    }
}
