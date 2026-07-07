import type { ExecutionContext } from '@nestjs/common'
import { ForbiddenException } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import { AdminGuard } from './admin.guard'
import type { AuthUser } from './auth-user'

function contextFor(user?: AuthUser): ExecutionContext {
    return {
        getType: () => 'http',
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext
}

const admin: AuthUser = { userId: 'u-1', email: 'a@b.c', role: 'athlete', isAdmin: true, avatar: null, locale: null }
const athlete: AuthUser = { userId: 'u-2', email: 'b@b.c', role: 'athlete', isAdmin: false, avatar: null, locale: null }

describe('AdminGuard', () => {
    it('allows a request from an admin principal', () => {
        expect(new AdminGuard().canActivate(contextFor(admin))).toBe(true)
    })

    it('forbids a non-admin principal', () => {
        expect(() => new AdminGuard().canActivate(contextFor(athlete))).toThrow(ForbiddenException)
    })

    it('forbids when there is no authenticated user', () => {
        expect(() => new AdminGuard().canActivate(contextFor(undefined))).toThrow(ForbiddenException)
    })
})
