import { UseGuards } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { z } from 'zod'

import { CurrentUser } from '../../../../auth/current-user.decorator'
import type { AuthUser } from '../../../../auth/auth-user'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { toSupportedLocale } from '../../../../shared/i18n/locale'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import type { ExerciseView } from '../../application/queries/list-exercises/list-exercises.handler'
import { ListExercisesQuery } from '../../application/queries/list-exercises/list-exercises.query'
import { EXERCISE_CATEGORIES, type ExerciseCategory } from '../../domain/exercise-taxonomy'
import { ExerciseType } from '../types/exercise.type'

/** Optional `category` filter, validated against the fixed taxonomy. */
const categoryArgSchema = z.enum(EXERCISE_CATEGORIES).optional()

@Resolver(() => ExerciseType)
@UseGuards(JwtCookieGuard)
export class ExerciseResolver {
    constructor(private readonly queryBus: QueryBus) {}

    @Query(() => [ExerciseType], { description: 'The exercise catalog, optionally filtered by category.' })
    async exercises(
        @CurrentUser() user: AuthUser,
        @Args('category', { type: () => String, nullable: true }, new ZodValidationPipe(categoryArgSchema))
        category?: ExerciseCategory,
    ): Promise<ExerciseType[]> {
        const query = new ListExercisesQuery(category, toSupportedLocale(user.locale))
        const views = await this.queryBus.execute<ListExercisesQuery, ExerciseView[]>(query)
        return views.map((view) => Object.assign(new ExerciseType(), view))
    }
}
