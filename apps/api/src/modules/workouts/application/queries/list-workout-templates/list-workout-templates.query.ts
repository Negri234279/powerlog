/** List the caller's templates (header + rollups), optionally filtered by name. */
export class ListWorkoutTemplatesQuery {
    constructor(
        public readonly ownerId: string,
        public readonly search?: string,
    ) {}
}
