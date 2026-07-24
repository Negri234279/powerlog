import type { TemplateScope } from '../../../domain/entities/workout-template.entity'

/** List the caller's templates (header + rollups), optionally filtered by name and
 *  scope (personal vs coaching). Omitting the scope returns both. */
export class ListWorkoutTemplatesQuery {
    constructor(
        public readonly ownerId: string,
        public readonly search?: string,
        public readonly scope?: TemplateScope,
    ) {}
}
