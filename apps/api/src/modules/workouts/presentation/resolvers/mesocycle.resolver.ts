import { UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql'
import { z } from 'zod'

import type { AuthUser } from '../../../../auth/auth-user'
import { CurrentUser } from '../../../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import { CreateMesocycleCommand } from '../../application/commands/create-mesocycle/create-mesocycle.command'
import { DeleteMesocycleCommand } from '../../application/commands/delete-mesocycle/delete-mesocycle.command'
import { GenerateMesocycleWeekCommand } from '../../application/commands/generate-mesocycle-week/generate-mesocycle-week.command'
import { SetMesocycleStatusCommand } from '../../application/commands/set-mesocycle-status/set-mesocycle-status.command'
import { UpdateMesocycleCommand } from '../../application/commands/update-mesocycle/update-mesocycle.command'
import type { MesocycleView } from '../../application/queries/get-mesocycle/get-mesocycle.handler'
import { GetMesocycleQuery } from '../../application/queries/get-mesocycle/get-mesocycle.query'
import type { WorkoutSessionView } from '../../application/queries/get-workout-session/get-workout-session.handler'
import type { MesocycleSummaryRow } from '../../application/ports/mesocycle-list.read-model'
import { ListMesocyclesQuery } from '../../application/queries/list-mesocycles/list-mesocycles.query'
import type { MesocycleStatus } from '../../domain/mesocycle-status'
import {
    GenerateMesocycleWeekInput,
    MesocycleInput,
    generateMesocycleWeekSchema,
    mesocycleSchema,
    mesocycleStatusSchema,
} from '../inputs/mesocycle.inputs'
import { MesocycleSummaryType, MesocycleType } from '../types/mesocycle.type'
import { WorkoutSessionType } from '../types/workout-session.type'

const uuidArg = z.string().uuid()
const searchArg = z.string().trim().min(1).max(100).optional()

@Resolver(() => MesocycleType)
@UseGuards(JwtCookieGuard)
export class MesocycleResolver {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
    ) {}

    @Query(() => [MesocycleSummaryType], {
        description: "The caller's mesocycles (newest first), with cheap rollups; optional name search.",
    })
    async mesocycles(
        @CurrentUser() user: AuthUser,
        @Args('search', { type: () => String, nullable: true }, new ZodValidationPipe(searchArg)) search?: string,
    ): Promise<MesocycleSummaryRow[]> {
        const query = new ListMesocyclesQuery(user.userId, search)
        return this.queryBus.execute(query)
    }

    @Query(() => MesocycleType, { description: 'One of the caller’s mesocycles, with its full tree.' })
    async mesocycle(
        @CurrentUser() user: AuthUser,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<MesocycleView> {
        const query = new GetMesocycleQuery(user.userId, id)
        return this.queryBus.execute(query)
    }

    @Mutation(() => MesocycleType, { description: 'Create a mesocycle (weeks → days → programmed sets).' })
    async createMesocycle(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(mesocycleSchema)) input: MesocycleInput,
    ): Promise<MesocycleView> {
        const command = new CreateMesocycleCommand(user.userId, input)
        return this.commandBus.execute(command)
    }

    @Mutation(() => MesocycleType, { description: 'Replace a mesocycle’s details and its whole week/day/set tree.' })
    async updateMesocycle(
        @CurrentUser() user: AuthUser,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
        @Args('input', new ZodValidationPipe(mesocycleSchema)) input: MesocycleInput,
    ): Promise<MesocycleView> {
        const command = new UpdateMesocycleCommand(user.userId, id, input)
        return this.commandBus.execute(command)
    }

    @Mutation(() => Boolean, { description: 'Delete a mesocycle (cascades to its weeks, days, exercises and sets).' })
    async deleteMesocycle(
        @CurrentUser() user: AuthUser,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
    ): Promise<boolean> {
        const command = new DeleteMesocycleCommand(user.userId, id)
        return this.commandBus.execute(command)
    }

    @Mutation(() => MesocycleType, {
        description: 'Transition a mesocycle’s status (draft/active/completed/archived).',
    })
    async setMesocycleStatus(
        @CurrentUser() user: AuthUser,
        @Args('id', { type: () => ID }, new ZodValidationPipe(uuidArg)) id: string,
        @Args('status', { type: () => String }, new ZodValidationPipe(mesocycleStatusSchema)) status: MesocycleStatus,
    ): Promise<MesocycleView> {
        const command = new SetMesocycleStatusCommand(user.userId, id, status)
        return this.commandBus.execute(command)
    }

    @Mutation(() => [WorkoutSessionType], {
        description: 'Generate one week of a mesocycle into dated planned sessions (one per training day).',
    })
    async generateMesocycleWeek(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(generateMesocycleWeekSchema)) input: GenerateMesocycleWeekInput,
    ): Promise<WorkoutSessionView[]> {
        const command = new GenerateMesocycleWeekCommand(
            user.userId,
            input.mesocycleId,
            input.week,
            input.weekStartDate,
            input.replace ?? undefined,
        )
        return this.commandBus.execute(command)
    }
}
