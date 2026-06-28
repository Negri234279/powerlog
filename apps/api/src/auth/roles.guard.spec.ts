import type { ExecutionContext } from '@nestjs/common'
import { ForbiddenException } from '@nestjs/common'
import type { Reflector } from '@nestjs/core'
import { describe, expect, it } from 'vitest'

import type { UserRoleValue } from '../modules/auth/domain/value-objects/user-role.vo'
import type { AuthUser } from './auth-user'
import { RolesGuard } from './roles.guard'

function contextFor(user?: AuthUser): ExecutionContext {
    return {
        getType: () => 'http',
        getHandler: () => () => undefined,
        getClass: () => class {},
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext
}

function guardWith(roles: UserRoleValue[] | undefined): RolesGuard {
    const reflector = { getAllAndOverride: () => roles } as unknown as Reflector
    return new RolesGuard(reflector)
}

const athlete: AuthUser = { userId: 'u-1', email: 'a@b.c', role: 'athlete', isAdmin: false, avatar: null }
const coach: AuthUser = { userId: 'u-2', email: 'c@b.c', role: 'coach', isAdmin: false, avatar: null }

describe('RolesGuard', () => {
    it('allows any request when no roles are required', () => {
        expect(guardWith(undefined).canActivate(contextFor())).toBe(true)
    })

    it('allows a user whose role is permitted', () => {
        expect(guardWith(['coach']).canActivate(contextFor(coach))).toBe(true)
    })

    it('forbids a user whose role is not permitted', () => {
        expect(() => guardWith(['coach']).canActivate(contextFor(athlete))).toThrow(ForbiddenException)
    })

    it('forbids when there is no authenticated user', () => {
        expect(() => guardWith(['coach']).canActivate(contextFor(undefined))).toThrow(ForbiddenException)
    })
})
