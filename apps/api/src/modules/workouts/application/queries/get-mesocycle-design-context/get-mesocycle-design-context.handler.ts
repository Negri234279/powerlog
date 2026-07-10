import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { GetMesocycleDesignContextQuery } from '../../../../../shared/contracts/get-mesocycle-design-context.query'
import type { MesocycleDesignContext } from '../../../../../shared/contracts/mesocycle-design-context'
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
 */
@QueryHandler(GetMesocycleDesignContextQuery)
export class GetMesocycleDesignContextHandler implements IQueryHandler<
    GetMesocycleDesignContextQuery,
    MesocycleDesignContext
> {
    constructor(
        private readonly exercises: ExerciseRepository,
        private readonly strength: AthleteStrengthReadModel,
    ) {}

    async execute(query: GetMesocycleDesignContextQuery): Promise<MesocycleDesignContext> {
        const [catalog, strength] = await Promise.all([
            this.exercises.findAll(),
            this.strength.forUser(query.userId, query.strengthLimit),
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
}
