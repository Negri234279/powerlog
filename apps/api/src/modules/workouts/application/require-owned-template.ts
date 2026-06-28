import type { WorkoutTemplateAggregate } from '../domain/entities/workout-template.entity'
import { WorkoutTemplateNotFoundError } from '../domain/errors/workouts.errors'
import type { WorkoutTemplateRepository } from '../domain/repositories/workout-template.repository'

/**
 * Loads a template the caller owns. Anything else — missing or someone else's —
 * surfaces as "not found" (no existence leak).
 */
export async function requireOwnedTemplate(
    templates: WorkoutTemplateRepository,
    templateId: string,
    ownerId: string,
): Promise<WorkoutTemplateAggregate> {
    const template = await templates.findById(templateId)
    if (!template || template.ownerId !== ownerId) {
        throw new WorkoutTemplateNotFoundError()
    }

    return template
}
