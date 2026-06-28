/** Fetch one of the caller's templates with its full exercise/set tree. */
export class GetWorkoutTemplateQuery {
    constructor(
        public readonly ownerId: string,
        public readonly templateId: string,
    ) {}
}
