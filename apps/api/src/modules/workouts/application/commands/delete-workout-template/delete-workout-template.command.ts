export class DeleteWorkoutTemplateCommand {
    constructor(
        public readonly ownerId: string,
        public readonly templateId: string,
    ) {}
}
