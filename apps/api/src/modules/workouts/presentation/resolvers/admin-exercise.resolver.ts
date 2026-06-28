import { UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql'
import { z } from 'zod'

import { AdminGuard } from '../../../../auth/admin.guard'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import { CreateExerciseCommand } from '../../application/commands/create-exercise/create-exercise.command'
import { DeleteExerciseCommand } from '../../application/commands/delete-exercise/delete-exercise.command'
import { UpdateExerciseCommand } from '../../application/commands/update-exercise/update-exercise.command'
import type { ExercisePatch } from '../../domain/entities/exercise.entity'
import type { ExerciseView } from '../../application/queries/list-exercises/list-exercises.handler'
import type { AdminExercisePageView } from '../../application/queries/list-admin-exercises/list-admin-exercises.handler'
import { ListAdminExercisesQuery } from '../../application/queries/list-admin-exercises/list-admin-exercises.query'
import type { ExerciseCategory, ExerciseEquipment, ExerciseMuscle } from '../../domain/exercise-taxonomy'
import {
    CreateExerciseInput,
    UpdateExerciseInput,
    categoriesArg,
    createExerciseSchema,
    equipmentArg,
    limitArg,
    musclesArg,
    offsetArg,
    searchArg,
    updateExerciseSchema,
} from '../inputs/admin-exercise.inputs'
import { AdminExercisePageType } from '../types/admin-exercise-page.type'
import { ExerciseType } from '../types/exercise.type'

const uuidArg = z.string().uuid()
const DEFAULT_LIMIT = 50

/** Admin-only catalog management: list with rich filters + create/edit/delete. */
@Resolver(() => ExerciseType)
@UseGuards(JwtCookieGuard, AdminGuard)
export class AdminExerciseResolver {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Query(() => AdminExercisePageType, {
        description: 'Exercise catalog for admins (filter by category/equipment/muscle/text; offset-paginated).',
    })
    async adminExercises(
        @Args('categories', { type: () => [String], nullable: true }, new ZodValidationPipe(categoriesArg))
        categories?: ExerciseCategory[],
        @Args('equipment', { type: () => [String], nullable: true }, new ZodValidationPipe(equipmentArg))
        equipment?: ExerciseEquipment[],
        @Args('muscles', { type: () => [String], nullable: true }, new ZodValidationPipe(musclesArg))
        muscles?: ExerciseMuscle[],
        @Args('search', { type: () => String, nullable: true }, new ZodValidationPipe(searchArg)) search?: string,
        @Args('limit', { type: () => Int, nullable: true }, new ZodValidationPipe(limitArg)) limit?: number,
        @Args('offset', { type: () => Int, nullable: true }, new ZodValidationPipe(offsetArg)) offset?: number,
    ): Promise<AdminExercisePageType> {
        const page = await this.queryBus.execute<ListAdminExercisesQuery, AdminExercisePageView>(
            new ListAdminExercisesQuery(
                { categories, equipment, muscles, search },
                limit ?? DEFAULT_LIMIT,
                offset ?? 0,
            ),
        )
        return { rows: page.rows.map(toType), total: page.total, limit: page.limit, offset: page.offset }
    }

    @Mutation(() => ExerciseType, { description: 'Create a catalog exercise.' })
    async createExercise(
        @Args('input', new ZodValidationPipe(createExerciseSchema)) input: CreateExerciseInput,
    ): Promise<ExerciseType> {
        const view = await this.commandBus.execute<CreateExerciseCommand, ExerciseView>(
            new CreateExerciseCommand(
                input.name,
                input.category as ExerciseCategory,
                input.equipment as ExerciseEquipment,
                input.primaryMuscle as ExerciseMuscle,
                input.slug,
            ),
        )
        return toType(view)
    }

    @Mutation(() => ExerciseType, { description: 'Edit a catalog exercise (slug is immutable).' })
    async updateExercise(
        @Args('input', new ZodValidationPipe(updateExerciseSchema)) input: UpdateExerciseInput,
    ): Promise<ExerciseType> {
        const patch: ExercisePatch = {}
        if (input.name != null) patch.name = input.name
        if (input.category != null) patch.category = input.category as ExerciseCategory
        if (input.equipment != null) patch.equipment = input.equipment as ExerciseEquipment
        if (input.primaryMuscle != null) patch.primaryMuscle = input.primaryMuscle as ExerciseMuscle

        const view = await this.commandBus.execute<UpdateExerciseCommand, ExerciseView>(
            new UpdateExerciseCommand(input.exerciseId, patch),
        )
        return toType(view)
    }

    @Mutation(() => Boolean, { description: 'Delete a catalog exercise (blocked if used in any workout).' })
    async deleteExercise(
        @Args('exerciseId', { type: () => ID }, new ZodValidationPipe(uuidArg)) exerciseId: string,
    ): Promise<boolean> {
        return this.commandBus.execute<DeleteExerciseCommand, boolean>(new DeleteExerciseCommand(exerciseId))
    }
}

function toType(view: ExerciseView): ExerciseType {
    return Object.assign(new ExerciseType(), view)
}
