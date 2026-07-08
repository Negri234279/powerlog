import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { MesocycleListReadModel, type MesocycleSummaryRow } from '../../ports/mesocycle-list.read-model'
import { ListMesocyclesQuery } from './list-mesocycles.query'

@QueryHandler(ListMesocyclesQuery)
export class ListMesocyclesHandler implements IQueryHandler<ListMesocyclesQuery, MesocycleSummaryRow[]> {
    constructor(private readonly mesocycles: MesocycleListReadModel) {}

    async execute(query: ListMesocyclesQuery): Promise<MesocycleSummaryRow[]> {
        return this.mesocycles.list({ ownerId: query.ownerId, search: query.search })
    }
}
