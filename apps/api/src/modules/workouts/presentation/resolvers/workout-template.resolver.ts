import { UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql'
import { z } from 'zod'

import type { AuthUser } from '../../../../auth/auth-user'
import { CurrentUser } from '../../../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { Roles } from '../../../../auth/roles.decorator'
import { RolesGuard } from '../../../../auth/roles.guard'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import { CreateSessionFromTemplateCommand } from '../../application/commands/create-session-from-template/create-session-from-template.command'
import { CreateWorkoutTemplateCommand } from '../../application/commands/create-workout-template/create-workout-template.command'
import { DeleteWorkoutTemplateCommand } from '../../application/commands/delete-workout-template/delete-workout-template.command'
import { PlanSessionFromTemplateCommand } from '../../application/commands/plan-session-from-template/plan-session-from-template.command'
import { UpdateWorkoutTemplateCommand } from '../../application/commands/update-workout-template/update-workout-template.command'
import type { WorkoutSessionView } from '../../application/queries/get-workout-session/get-workout-session.handler'
import { GetWorkoutTemplateQuery } from '../../application/queries/get-workout-template/get-workout-template.query'
import type { WorkoutTemplateView } from '../../application/queries/get-workout-template/get-workout-template.handler'
import { ListWorkoutTemplatesQuery } from '../../application/queries/list-workout-templates/list-workout-templates.query'
import type { WorkoutTemplateSummaryRow } from '../../application/ports/workout-template-list.read-model'
import {
    CreateSessionFromTemplateInput,
    PlanSessionFromTemplateInput,
    WorkoutTemplateInput,
    createSessionFromTemplateSchema,
    planSessionFromTemplateSchema,
    workoutTemplateSchema,
} from '../inputs/workout-template.inputs'
import { WorkoutSessionType } from '../types/workout-session.type'
import { WorkoutTemplateSummaryType, WorkoutTemplateType } from '../types/workout-template.type'

const uuidArg = z.string().uuid()
const searchArg = z.string().trim().min(1).max(100).optional()

@Resolver(() => WorkoutTemplateType)
@UseGuards(JwtCookieGuard)
export class WorkoutTemplateResolver {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Query(() => [WorkoutTemplateSummaryType], {
        description: "The caller's templates (name-ordered), with cheap rollups; optional name search.",
    })
    async workoutTemplates(
        @CurrentUser() user: AuthUser,
        @Args('search', { type: () => String, nullable: true }, new ZodValidationPipe(searchArg)) search?: string,
    ): Promise<WorkoutTemplateSummaryRow[]> {
        return this.queryBus.execute(new ListWorkoutTemplatesQuery(user.userId, search))
    }

    @Query(() => WorkoutTemplateType, { description: 'One of the caller’s templates, with its full tree.' })
    async workoutTemplate(
        @CurrentUser() user: AuthUser,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<WorkoutTemplateView> {
        return this.queryBus.execute(new GetWorkoutTemplateQuery(user.userId, id))
    }

    @Mutation(() => WorkoutTemplateType, { description: 'Create a reusable workout template.' })
    async createWorkoutTemplate(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(workoutTemplateSchema)) input: WorkoutTemplateInput,
    ): Promise<WorkoutTemplateView> {
        return this.commandBus.execute(new CreateWorkoutTemplateCommand(user.userId, input))
    }

    @Mutation(() => WorkoutTemplateType, { description: 'Replace a template’s name, notes and exercise/set tree.' })
    async updateWorkoutTemplate(
        @CurrentUser() user: AuthUser,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
        @Args('input', new ZodValidationPipe(workoutTemplateSchema)) input: WorkoutTemplateInput,
    ): Promise<WorkoutTemplateView> {
        return this.commandBus.execute(new UpdateWorkoutTemplateCommand(user.userId, id, input))
    }

    @Mutation(() => Boolean, { description: 'Delete a template (cascades to its exercises and sets).' })
    async deleteWorkoutTemplate(
        @CurrentUser() user: AuthUser,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<boolean> {
        return this.commandBus.execute(new DeleteWorkoutTemplateCommand(user.userId, id))
    }

    @Mutation(() => WorkoutSessionType, {
        description: 'Create a session for yourself, pre-filled from one of your templates (status: planned).',
    })
    async createSessionFromTemplate(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(createSessionFromTemplateSchema)) input: CreateSessionFromTemplateInput,
    ): Promise<WorkoutSessionView> {
        return this.commandBus.execute(
            new CreateSessionFromTemplateCommand(user.userId, input.templateId, input.performedAt, input.notes),
        )
    }

    @Mutation(() => WorkoutSessionType, {
        description: 'Plan a session for an athlete from one of your templates (coaches only; status: planned).',
    })
    @UseGuards(RolesGuard)
    @Roles('coach')
    async planSessionFromTemplate(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(planSessionFromTemplateSchema)) input: PlanSessionFromTemplateInput,
    ): Promise<WorkoutSessionView> {
        return this.commandBus.execute(
            new PlanSessionFromTemplateCommand(
                user.userId,
                input.athleteId,
                input.templateId,
                input.performedAt,
                input.notes,
            ),
        )
    }
}
