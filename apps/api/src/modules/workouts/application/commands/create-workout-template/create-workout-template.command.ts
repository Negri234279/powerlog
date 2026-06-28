import type { TemplateContentRaw } from '../../template-content'

export class CreateWorkoutTemplateCommand {
    constructor(
        public readonly ownerId: string,
        public readonly content: TemplateContentRaw,
    ) {}
}
