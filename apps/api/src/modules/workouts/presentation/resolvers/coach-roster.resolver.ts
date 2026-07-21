import { UseGuards } from '@nestjs/common'
import { QueryBus } from '@nestjs/cqrs'
import { Args, Query, Resolver } from '@nestjs/graphql'
import { z } from 'zod'

import type { AuthUser } from '../../../../auth/auth-user'
import { CurrentUser } from '../../../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { Roles } from '../../../../auth/roles.decorator'
import { RolesGuard } from '../../../../auth/roles.guard'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import type { CoachRosterEntry } from '../../application/queries/get-coach-roster/get-coach-roster.handler'
import { GetCoachRosterQuery } from '../../application/queries/get-coach-roster/get-coach-roster.query'
import { CoachRosterEntryType } from '../types/coach-roster.type'

const isoDate = z.string().datetime().optional()

/**
 * The coach's whole roster in one query.
 *
 * Deliberately **not** on `AthleteViewResolver`: everything there takes an
 * `athleteId` and is gated by `LinkedAthleteGuard`, which rejects any call
 * without one. This query has no athlete argument by design — it derives the
 * roster from the caller's own links, so there is no id to authorize and nothing
 * a coach could ask for that isn't already theirs.
 */
@Resolver()
@UseGuards(JwtCookieGuard, RolesGuard)
@Roles('coach')
export class CoachRosterResolver {
    constructor(private readonly queryBus: QueryBus) {}

    @Query(() => [CoachRosterEntryType], {
        description:
            'Training rollups for every athlete the calling coach coaches, in one grouped pass. Identity is not included — merge with `myAthletes` by athleteId (coaches only).',
    })
    async myAthleteRoster(
        @CurrentUser() user: AuthUser,
        @Args('from', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) from?: string,
        @Args('to', { type: () => String, nullable: true }, new ZodValidationPipe(isoDate)) to?: string,
    ): Promise<CoachRosterEntry[]> {
        const query = new GetCoachRosterQuery(user.userId, from, to)
        return this.queryBus.execute(query)
    }
}
