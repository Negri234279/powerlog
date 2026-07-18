import type { TemplateScope } from '../../../domain/entities/workout-template.entity'
import type { TemplateContentRaw } from '../../template-content'

export class CreateWorkoutTemplateCommand {
    constructor(
        public readonly ownerId: string,
        public readonly content: TemplateContentRaw,
        /** Personal (own training) or coaching (for athletes). Defaults to personal. */
        public readonly scope: TemplateScope = 'personal',
    ) {}
}
