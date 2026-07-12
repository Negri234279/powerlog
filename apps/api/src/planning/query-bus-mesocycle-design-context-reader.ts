import { Injectable } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'

import { GetMesocycleDesignContextQuery } from '../shared/contracts/get-mesocycle-design-context.query'
import { type MesocycleDesignContext, MesocycleDesignContextReader } from '../shared/contracts/mesocycle-design-context'

/**
 * How many of the athlete's lifts the model is shown. Enough to anchor the loads
 * of a whole week's programming, few enough that the prompt stays cheap — the
 * catalog itself is already 274 lines.
 */
const STRENGTH_LIMIT = 30

/**
 * Bridges the AI-side `MesocycleDesignContextReader` port to the workouts module
 * via the QueryBus. Kept outside `src/modules` so dispatching the shared query
 * never crosses a module boundary, and decoupled through the bus (global via
 * `CqrsModule.forRoot`) so ai and workouts don't depend on each other. Mirrors
 * `QueryBusSessionPlanContextReader`.
 */
@Injectable()
export class QueryBusMesocycleDesignContextReader extends MesocycleDesignContextReader {
    constructor(private readonly queryBus: QueryBus) {
        super()
    }

    async read(userId: string, athleteId: string | null = null): Promise<MesocycleDesignContext> {
        const query = new GetMesocycleDesignContextQuery(userId, STRENGTH_LIMIT, athleteId)

        return this.queryBus.execute<GetMesocycleDesignContextQuery, MesocycleDesignContext>(query)
    }
}
