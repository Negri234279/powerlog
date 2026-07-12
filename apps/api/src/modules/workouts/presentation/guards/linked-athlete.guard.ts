import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common'
import { type GqlContextType, GqlExecutionContext } from '@nestjs/graphql'

import type { AuthUser } from '../../../../auth/auth-user'
import { CoachLinks } from '../../../../shared/contracts/coach-links'
import { NotLinkedToAthleteError } from '../../domain/errors/workouts.errors'

interface AthleteArgs {
    athleteId?: string
}

interface GqlRequest {
    user?: AuthUser
}

/**
 * Authorizes the coach's read access to one athlete's training. Every field it
 * guards takes an `athleteId` argument; the caller must currently coach that
 * athlete. Runs after `JwtCookieGuard` + `RolesGuard` (`@Roles('coach')`), and
 * only on GraphQL — the athlete views have no REST surface.
 *
 * Because the link is checked on every request, revoking it (coach removed /
 * athlete left) cuts the coach's access immediately.
 */
@Injectable()
export class LinkedAthleteGuard implements CanActivate {
    constructor(private readonly coachLinks: CoachLinks) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        if (context.getType<GqlContextType>() !== 'graphql') throw new NotLinkedToAthleteError()

        const gql = GqlExecutionContext.create(context)
        const { athleteId } = gql.getArgs<AthleteArgs>()
        const { user } = gql.getContext<{ req: GqlRequest }>().req

        if (!user || !athleteId || !(await this.coachLinks.areLinked(user.userId, athleteId))) {
            throw new NotLinkedToAthleteError()
        }

        return true
    }
}
