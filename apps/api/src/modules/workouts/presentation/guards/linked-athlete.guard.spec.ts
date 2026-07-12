import type { ExecutionContext } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import type { AuthUser } from '../../../../auth/auth-user'
import { FakeCoachLinks } from '../../../../../tests/doubles/shared'
import { NotLinkedToAthleteError } from '../../domain/errors/workouts.errors'
import { LinkedAthleteGuard } from './linked-athlete.guard'

const COACH_ID = '11111111-1111-4111-8111-111111111111'
const ATHLETE_ID = '22222222-2222-4222-8222-222222222222'

const coach: AuthUser = {
    userId: COACH_ID,
    email: 'coach@powerlog.dev',
    role: 'coach',
    isAdmin: false,
    avatar: null,
    locale: null,
}

/** GraphQL execution context: resolver args are [root, args, context, info]. */
function gqlContext(args: unknown, user?: AuthUser): ExecutionContext {
    const resolverArgs = [null, args, { req: { user } }, null]
    return {
        getType: () => 'graphql',
        getArgs: () => resolverArgs,
        getArgByIndex: (i: number) => resolverArgs[i],
        getClass: () => class {},
        getHandler: () => function handler() {},
    } as unknown as ExecutionContext
}

function guardLinking(...pairs: Array<[string, string]>): LinkedAthleteGuard {
    const links = new FakeCoachLinks()
    for (const [coachId, athleteId] of pairs) links.link(coachId, athleteId)
    return new LinkedAthleteGuard(links)
}

describe('LinkedAthleteGuard', () => {
    it('allows a coach reading an athlete they coach', async () => {
        const guard = guardLinking([COACH_ID, ATHLETE_ID])

        await expect(guard.canActivate(gqlContext({ athleteId: ATHLETE_ID }, coach))).resolves.toBe(true)
    })

    it('rejects a coach reading an athlete they do not coach', async () => {
        const guard = guardLinking()

        await expect(guard.canActivate(gqlContext({ athleteId: ATHLETE_ID }, coach))).rejects.toBeInstanceOf(
            NotLinkedToAthleteError,
        )
    })

    it('rejects when the athleteId argument is missing', async () => {
        const guard = guardLinking([COACH_ID, ATHLETE_ID])

        await expect(guard.canActivate(gqlContext({}, coach))).rejects.toBeInstanceOf(NotLinkedToAthleteError)
    })

    it('rejects when there is no authenticated user', async () => {
        const guard = guardLinking([COACH_ID, ATHLETE_ID])

        await expect(guard.canActivate(gqlContext({ athleteId: ATHLETE_ID }))).rejects.toBeInstanceOf(
            NotLinkedToAthleteError,
        )
    })
})
