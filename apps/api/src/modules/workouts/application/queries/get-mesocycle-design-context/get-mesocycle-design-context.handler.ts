import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { CoachLinks } from '../../../../../shared/contracts/coach-links'
import { GetMesocycleDesignContextQuery } from '../../../../../shared/contracts/get-mesocycle-design-context.query'
import type { MesocycleDesignContext } from '../../../../../shared/contracts/mesocycle-design-context'
import { NotLinkedToAthleteError } from '../../../domain/errors/workouts.errors'
import { ExerciseRepository } from '../../../domain/repositories/exercise.repository'
import { AthleteStrengthReadModel } from '../../ports/athlete-strength.read-model'

/**
 * Assembles what the AI module needs to design a training block: the whole
 * exercise catalog, and how strong this athlete is on the lifts they have
 * trained. Workouts owns both, so it builds the snapshot itself; the AI module
 * never reaches into the schema.
 *
 * The catalog is served with its **canonical English names**, deliberately
 * unlocalized: they are what the model was trained on, and the athlete never sees
 * them — the client renders each exercise from its own localized catalog once the
 * slug has been resolved to an id.
 *
 * Whose strength goes in is the question that matters: **the person who will train
 * the block**. When a coach designs for an athlete (`athleteId` set, link checked
 * here) the loads are anchored on the athlete's lifts — a block built off the
 * coach's own e1RMs would prescribe someone else's kilos, and nothing downstream
 * would catch it.
 */
@QueryHandler(GetMesocycleDesignContextQuery)
export class GetMesocycleDesignContextHandler implements IQueryHandler<
    GetMesocycleDesignContextQuery,
    MesocycleDesignContext
> {
    constructor(
        private readonly exercises: ExerciseRepository,
        private readonly strength: AthleteStrengthReadModel,
        private readonly coachLinks: CoachLinks,
    ) {}

    async execute(query: GetMesocycleDesignContextQuery): Promise<MesocycleDesignContext> {
        const trainee = await this.resolveTrainee(query)

        const [catalog, strength] = await Promise.all([
            this.exercises.findAll(),
            this.strength.forUser(trainee, query.strengthLimit),
        ])

        return {
            catalog: catalog.map((exercise) => ({
                exerciseId: exercise.id,
                slug: exercise.slug,
                name: exercise.name,
                category: exercise.category,
                equipment: exercise.equipment,
                primaryMuscle: exercise.primaryMuscle,
            })),
            strength: strength.map((lift) => ({ ...lift })),
        }
    }

    /** Whose lifts anchor the loads: the caller, or the athlete they coach. */
    private async resolveTrainee(query: GetMesocycleDesignContextQuery): Promise<string> {
        const { athleteId, userId } = query
        if (athleteId === null || athleteId === userId) return userId

        if (!(await this.coachLinks.areLinked(userId, athleteId))) throw new NotLinkedToAthleteError()

        return athleteId
    }
}
