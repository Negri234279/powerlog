import type { MesocycleAggregate } from '../domain/entities/mesocycle.entity'
import { MesocycleNotFoundError } from '../domain/errors/workouts.errors'
import type { MesocycleRepository } from '../domain/repositories/mesocycle.repository'

/**
 * Loads a mesocycle the caller owns. Anything else — missing or someone else's —
 * surfaces as "not found" (no existence leak).
 */
export async function requireOwnedMesocycle(
    mesocycles: MesocycleRepository,
    mesocycleId: string,
    ownerId: string,
): Promise<MesocycleAggregate> {
    const mesocycle = await mesocycles.findById(mesocycleId)
    if (!mesocycle || mesocycle.ownerId !== ownerId) {
        throw new MesocycleNotFoundError()
    }

    return mesocycle
}
