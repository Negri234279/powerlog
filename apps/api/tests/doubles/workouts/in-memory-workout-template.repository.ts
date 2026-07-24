import type {
    TemplateScope,
    WorkoutTemplateAggregate,
} from '../../../src/modules/workouts/domain/entities/workout-template.entity'
import { WorkoutTemplateRepository } from '../../../src/modules/workouts/domain/repositories/workout-template.repository'

/** In-memory WorkoutTemplateRepository keyed by id; `save` upserts. */
export class InMemoryWorkoutTemplateRepository extends WorkoutTemplateRepository {
    private readonly store = new Map<string, WorkoutTemplateAggregate>()

    constructor(seed: WorkoutTemplateAggregate[] = []) {
        super()
        for (const template of seed) this.store.set(template.id, template)
    }

    async save(template: WorkoutTemplateAggregate): Promise<void> {
        this.store.set(template.id, template)
    }

    async findById(id: string): Promise<WorkoutTemplateAggregate | null> {
        return this.store.get(id) ?? null
    }

    async countByOwnerAndScope(ownerId: string, scope: TemplateScope): Promise<number> {
        let n = 0
        for (const template of this.store.values()) {
            if (template.ownerId === ownerId && template.scope === scope) n++
        }

        return n
    }

    async delete(id: string): Promise<void> {
        this.store.delete(id)
    }

    async deleteAllByOwner(ownerId: string): Promise<void> {
        for (const [id, template] of this.store) {
            if (template.ownerId === ownerId) this.store.delete(id)
        }
    }

    /** Test helper: number of stored templates. */
    get size(): number {
        return this.store.size
    }
}
