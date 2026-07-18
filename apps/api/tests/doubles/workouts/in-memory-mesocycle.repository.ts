import type { MesocycleAggregate } from '../../../src/modules/workouts/domain/entities/mesocycle.entity'
import { MesocycleRepository } from '../../../src/modules/workouts/domain/repositories/mesocycle.repository'

/** In-memory MesocycleRepository keyed by id; `save` upserts. */
export class InMemoryMesocycleRepository extends MesocycleRepository {
    private readonly store = new Map<string, MesocycleAggregate>()

    constructor(seed: MesocycleAggregate[] = []) {
        super()
        for (const mesocycle of seed) this.store.set(mesocycle.id, mesocycle)
    }

    async save(mesocycle: MesocycleAggregate): Promise<void> {
        this.store.set(mesocycle.id, mesocycle)
    }

    async findById(id: string): Promise<MesocycleAggregate | null> {
        return this.store.get(id) ?? null
    }

    async countSelfCreatedBy(userId: string): Promise<number> {
        let n = 0
        for (const mesocycle of this.store.values()) {
            if (mesocycle.ownerId === userId && mesocycle.plannedByUserId === null) n++
        }

        return n
    }

    async countPlannedForAthletesBy(coachId: string): Promise<number> {
        let n = 0
        for (const mesocycle of this.store.values()) {
            if (mesocycle.plannedByUserId === coachId) n++
        }

        return n
    }

    async delete(id: string): Promise<void> {
        this.store.delete(id)
    }

    async deleteAllByOwner(ownerId: string): Promise<void> {
        for (const [id, mesocycle] of this.store) {
            if (mesocycle.ownerId === ownerId) this.store.delete(id)
        }
    }

    /** Test helper: number of stored mesocycles. */
    get size(): number {
        return this.store.size
    }
}
