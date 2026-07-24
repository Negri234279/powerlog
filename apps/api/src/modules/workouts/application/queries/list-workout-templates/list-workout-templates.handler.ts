import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import {
    type WorkoutTemplateSummaryRow,
    WorkoutTemplateListReadModel,
} from '../../ports/workout-template-list.read-model'
import { ListWorkoutTemplatesQuery } from './list-workout-templates.query'

@QueryHandler(ListWorkoutTemplatesQuery)
export class ListWorkoutTemplatesHandler implements IQueryHandler<
    ListWorkoutTemplatesQuery,
    WorkoutTemplateSummaryRow[]
> {
    constructor(private readonly templates: WorkoutTemplateListReadModel) {}

    async execute(query: ListWorkoutTemplatesQuery): Promise<WorkoutTemplateSummaryRow[]> {
        return this.templates.list({ ownerId: query.ownerId, search: query.search, scope: query.scope })
    }
}
