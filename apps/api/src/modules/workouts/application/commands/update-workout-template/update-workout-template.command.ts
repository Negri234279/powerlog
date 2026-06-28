import type { TemplateContentRaw } from '../../template-content'

export class UpdateWorkoutTemplateCommand {
    constructor(
        public readonly ownerId: string,
        public readonly templateId: string,
        public readonly content: TemplateContentRaw,
    ) {}
}
