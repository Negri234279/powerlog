import { UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { Args, ID, Int, Mutation, Query, Resolver } from '@nestjs/graphql'
import { z } from 'zod'

import type { AuthUser } from '../../../../auth/auth-user'
import { CurrentUser } from '../../../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { Roles } from '../../../../auth/roles.decorator'
import { RolesGuard } from '../../../../auth/roles.guard'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import { AddExerciseEntryCommand } from '../../application/commands/add-exercise-entry/add-exercise-entry.command'
import { CompleteWorkoutSessionCommand } from '../../application/commands/complete-workout-session/complete-workout-session.command'
import { CreateWorkoutSessionCommand } from '../../application/commands/create-workout-session/create-workout-session.command'
import { DeleteWorkoutSessionCommand } from '../../application/commands/delete-workout-session/delete-workout-session.command'
import { LogSetCommand } from '../../application/commands/log-set/log-set.command'
import { PlanWorkoutSessionCommand } from '../../application/commands/plan-workout-session/plan-workout-session.command'
import { RemoveExerciseEntryCommand } from '../../application/commands/remove-exercise-entry/remove-exercise-entry.command'
import { RemoveSetCommand } from '../../application/commands/remove-set/remove-set.command'
import { UpdateSetCommand } from '../../application/commands/update-set/update-set.command'
import { UpdateWorkoutSessionCommand } from '../../application/commands/update-workout-session/update-workout-session.command'
import { GetWorkoutSessionQuery } from '../../application/queries/get-workout-session/get-workout-session.query'
import type { WorkoutSessionView } from '../../application/queries/get-workout-session/get-workout-session.handler'
import type { WorkoutHistoryPage } from '../../application/queries/list-workout-sessions/list-workout-sessions.handler'
import { ListWorkoutSessionsQuery } from '../../application/queries/list-workout-sessions/list-workout-sessions.query'
import { WORKOUT_STATUSES, type WorkoutStatus } from '../../domain/workout-status'
import { WorkoutHistoryPageType } from '../types/workout-history.type'
import {
    AddExerciseEntryInput,
    CreateWorkoutSessionInput,
    LogSetInput,
    PlanWorkoutSessionInput,
    UpdateSetInput,
    UpdateWorkoutSessionInput,
    addExerciseEntrySchema,
    createWorkoutSessionSchema,
    logSetSchema,
    planWorkoutSessionSchema,
    updateSetSchema,
    updateWorkoutSessionSchema,
} from '../inputs/workout-session.inputs'
import { WorkoutSessionType } from '../types/workout-session.type'

const uuidArg = z.string().uuid()
const limitArg = z.coerce.number().int().min(1).max(50).optional()
const statusArg = z.enum(WORKOUT_STATUSES).optional()
const isoDateArg = z.string().datetime().optional()
const exerciseIdArg = z.string().uuid().optional()
const queryArg = z.string().trim().min(1).max(100).optional()
const cursorArg = z.string().min(1).optional()

const DEFAULT_HISTORY_LIMIT = 20

@Resolver(() => WorkoutSessionType)
@UseGuards(JwtCookieGuard)
export class WorkoutSessionResolver {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Query(() => WorkoutSessionType, { description: 'A workout session owned by the caller, with its full tree.' })
    async workoutSession(
        @CurrentUser() user: AuthUser,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<WorkoutSessionView> {
        const query = new GetWorkoutSessionQuery(user.userId, id)
        return this.queryBus.execute(query)
    }

    @Query(() => WorkoutHistoryPageType, {
        description:
            "The caller's session history, newest first (keyset-paginated; optional status/date/exercise/notes filters).",
    })
    async workoutHistory(
        @CurrentUser() user: AuthUser,
        @Args('limit', { type: () => Int, nullable: true }, new ZodValidationPipe(limitArg)) limit?: number,
        @Args('status', { type: () => String, nullable: true }, new ZodValidationPipe(statusArg))
        status?: WorkoutStatus,
        @Args('from', { type: () => String, nullable: true }, new ZodValidationPipe(isoDateArg)) from?: string,
        @Args('to', { type: () => String, nullable: true }, new ZodValidationPipe(isoDateArg)) to?: string,
        @Args('exerciseId', { type: () => ID, nullable: true }, new ZodValidationPipe(exerciseIdArg))
        exerciseId?: string,
        @Args('query', { type: () => String, nullable: true }, new ZodValidationPipe(queryArg)) query?: string,
        @Args('cursor', { type: () => String, nullable: true }, new ZodValidationPipe(cursorArg)) cursor?: string,
    ): Promise<WorkoutHistoryPage> {
        const listQuery = new ListWorkoutSessionsQuery(
            user.userId,
            limit ?? DEFAULT_HISTORY_LIMIT,
            status,
            from,
            to,
            exerciseId,
            query,
            cursor,
        )
        return this.queryBus.execute(listQuery)
    }

    @Mutation(() => WorkoutSessionType, { description: 'Create a workout session (status: planned).' })
    async createWorkoutSession(
        @CurrentUser() user: AuthUser,
        @Args(
            'input',
            { type: () => CreateWorkoutSessionInput, nullable: true },
            new ZodValidationPipe(createWorkoutSessionSchema),
        )
        input?: CreateWorkoutSessionInput | null,
    ): Promise<WorkoutSessionView> {
        const command = new CreateWorkoutSessionCommand(user.userId, input?.performedAt, input?.notes)
        return this.commandBus.execute(command)
    }

    @Mutation(() => WorkoutSessionType, {
        description: 'Plan a session for one of your athletes (coaches only; status: planned).',
    })
    @UseGuards(RolesGuard)
    @Roles('coach')
    async planWorkoutSession(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(planWorkoutSessionSchema)) input: PlanWorkoutSessionInput,
    ): Promise<WorkoutSessionView> {
        const command = new PlanWorkoutSessionCommand(user.userId, input.athleteId, input.performedAt, input.notes)
        return this.commandBus.execute(command)
    }

    @Mutation(() => WorkoutSessionType, { description: 'Add an exercise to a session.' })
    async addExerciseEntry(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(addExerciseEntrySchema)) input: AddExerciseEntryInput,
    ): Promise<WorkoutSessionView> {
        const command = new AddExerciseEntryCommand(user.userId, input.sessionId, input.exerciseId, input.notes)
        return this.commandBus.execute(command)
    }

    @Mutation(() => WorkoutSessionType, { description: 'Remove an exercise (and its sets) from a session.' })
    async removeExerciseEntry(
        @CurrentUser() user: AuthUser,
        @Args('sessionId', { type: () => ID }, new ZodValidationPipe(uuidArg)) sessionId: string,
        @Args('entryId', { type: () => ID }, new ZodValidationPipe(uuidArg)) entryId: string,
    ): Promise<WorkoutSessionView> {
        const command = new RemoveExerciseEntryCommand(user.userId, sessionId, entryId)
        return this.commandBus.execute(command)
    }

    @Mutation(() => WorkoutSessionType, { description: 'Append a set to an exercise entry.' })
    async logSet(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(logSetSchema)) input: LogSetInput,
    ): Promise<WorkoutSessionView> {
        const { sessionId, entryId, ...set } = input
        const command = new LogSetCommand(user.userId, sessionId, entryId, set)
        return this.commandBus.execute(command)
    }

    @Mutation(() => WorkoutSessionType, { description: 'Edit a set (absent = leave, null = clear).' })
    async updateSet(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(updateSetSchema)) input: UpdateSetInput,
    ): Promise<WorkoutSessionView> {
        const { sessionId, entryId, setId, ...fields } = input
        const command = new UpdateSetCommand(user.userId, sessionId, entryId, setId, fields)
        return this.commandBus.execute(command)
    }

    @Mutation(() => WorkoutSessionType, { description: 'Remove a set from an exercise entry.' })
    async removeSet(
        @CurrentUser() user: AuthUser,
        @Args('sessionId', { type: () => ID }, new ZodValidationPipe(uuidArg)) sessionId: string,
        @Args('entryId', { type: () => ID }, new ZodValidationPipe(uuidArg)) entryId: string,
        @Args('setId', { type: () => ID }, new ZodValidationPipe(uuidArg)) setId: string,
    ): Promise<WorkoutSessionView> {
        const command = new RemoveSetCommand(user.userId, sessionId, entryId, setId)
        return this.commandBus.execute(command)
    }

    @Mutation(() => WorkoutSessionType, { description: 'Mark a session as completed.' })
    async completeWorkoutSession(
        @CurrentUser() user: AuthUser,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<WorkoutSessionView> {
        const command = new CompleteWorkoutSessionCommand(user.userId, id)
        return this.commandBus.execute(command)
    }

    @Mutation(() => WorkoutSessionType, {
        description: 'Edit a session’s date and/or notes (absent = leave, notes null = clear).',
    })
    async updateWorkoutSession(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(updateWorkoutSessionSchema)) input: UpdateWorkoutSessionInput,
    ): Promise<WorkoutSessionView> {
        const command = new UpdateWorkoutSessionCommand(
            user.userId,
            input.sessionId,
            input.performedAt ?? undefined,
            input.notes,
        )
        return this.commandBus.execute(command)
    }

    @Mutation(() => Boolean, { description: 'Delete a session (cascades to entries and sets).' })
    async deleteWorkoutSession(
        @CurrentUser() user: AuthUser,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<boolean> {
        const command = new DeleteWorkoutSessionCommand(user.userId, id)
        return this.commandBus.execute(command)
    }
}
