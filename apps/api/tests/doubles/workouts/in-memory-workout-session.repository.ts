import type { WorkoutSessionAggregate } from '../../../src/modules/workouts/domain/entities/workout-session.entity'
import { WorkoutSessionRepository } from '../../../src/modules/workouts/domain/repositories/workout-session.repository'

/** In-memory WorkoutSessionRepository keyed by id; `save` upserts. */
export class InMemoryWorkoutSessionRepository extends WorkoutSessionRepository {
    private readonly store = new Map<string, WorkoutSessionAggregate>()

    constructor(seed: WorkoutSessionAggregate[] = []) {
        super()
        for (const session of seed) this.store.set(session.id, session)
    }

    async save(session: WorkoutSessionAggregate): Promise<void> {
        this.store.set(session.id, session)
    }

    async findById(id: string): Promise<WorkoutSessionAggregate | null> {
        return this.store.get(id) ?? null
    }

    async delete(id: string): Promise<void> {
        this.store.delete(id)
    }

    async deleteAllByUser(userId: string): Promise<void> {
        for (const [id, session] of this.store) {
            if (session.userId === userId) this.store.delete(id)
        }
    }

    /** Test helper: number of stored sessions. */
    get size(): number {
        return this.store.size
    }
}
