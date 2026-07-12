import type { CoachLinks } from '../../../shared/contracts/coach-links'
import type { MesocycleAggregate } from '../domain/entities/mesocycle.entity'
import { MesocycleManagedByCoachError, MesocycleNotFoundError } from '../domain/errors/workouts.errors'
import type { MesocycleRepository } from '../domain/repositories/mesocycle.repository'

/**
 * Loads a mesocycle the caller may edit (content, status, week generation).
 *
 * A block a coach planned for their athlete is edited by the **coach**: the
 * athlete owns it and trains what it generates, but it is read-only to them
 * (`MESOCYCLE_MANAGED_BY_COACH` — not a "not found", since they can see it).
 * Everything else — self-made blocks, and coached blocks whose link is gone —
 * is edited by the owner, so ending the relationship never strands a block.
 *
 * Anything unrelated to the caller surfaces as "not found" (no existence leak).
 */
export async function requireManageableMesocycle(
    mesocycles: MesocycleRepository,
    coachLinks: CoachLinks,
    mesocycleId: string,
    userId: string,
): Promise<MesocycleAggregate> {
    const mesocycle = await mesocycles.findById(mesocycleId)
    if (!mesocycle) throw new MesocycleNotFoundError()

    const coachId = mesocycle.plannedByUserId
    if (coachId !== null && (await coachLinks.areLinked(coachId, mesocycle.ownerId))) {
        if (userId === coachId) return mesocycle
        if (userId === mesocycle.ownerId) throw new MesocycleManagedByCoachError()
        throw new MesocycleNotFoundError()
    }

    if (mesocycle.ownerId !== userId) throw new MesocycleNotFoundError()

    return mesocycle
}

/**
 * Loads a mesocycle the caller may *read*: its owner, or the coach who plans it
 * for them while the link lasts. Coaches open their athletes' blocks on the same
 * screen as their own — editing is what `requireManageableMesocycle` gates.
 */
export async function requireReadableMesocycle(
    mesocycles: MesocycleRepository,
    coachLinks: CoachLinks,
    mesocycleId: string,
    userId: string,
): Promise<MesocycleAggregate> {
    const mesocycle = await mesocycles.findById(mesocycleId)
    if (!mesocycle) throw new MesocycleNotFoundError()

    if (mesocycle.ownerId === userId) return mesocycle

    const coachId = mesocycle.plannedByUserId
    if (coachId === userId && (await coachLinks.areLinked(coachId, mesocycle.ownerId))) return mesocycle

    throw new MesocycleNotFoundError()
}
