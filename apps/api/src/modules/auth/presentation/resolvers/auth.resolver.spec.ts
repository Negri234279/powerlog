import type { CommandBus, QueryBus } from '@nestjs/cqrs'
import type { ConfigService } from '@nestjs/config'
import type { Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

import type { Env } from '../../../../config/env'
import { AuthCookies } from '../cookies/auth-cookies'
import { AuthResolver } from './auth.resolver'

const CONFIG = {
    AUTH_COOKIE_NAME: 'pl_at',
    REFRESH_COOKIE_NAME: 'pl_rt',
    JWT_EXPIRES_IN: '15m',
    REFRESH_EXPIRES_IN: '30d',
    COOKIE_SECURE: true,
    // Present so any accidental cookie write on the failure path would be caught.
    COOKIE_DOMAIN: 'powerlog.negri.es',
}

function buildCookies(): AuthCookies {
    const config = { get: (key: keyof Env) => CONFIG[key as keyof typeof CONFIG] } as unknown as ConfigService<
        Env,
        true
    >

    return new AuthCookies(config)
}

function fakeCtx(): {
    ctx: { req: Request; res: Response }
    cookie: ReturnType<typeof vi.fn>
    clearCookie: ReturnType<typeof vi.fn>
} {
    const cookie = vi.fn()
    const clearCookie = vi.fn()
    const req = { cookies: { pl_rt: 'a-refresh-token' }, headers: {}, ip: '1.2.3.4' } as unknown as Request
    const res = { cookie, clearCookie } as unknown as Response

    return { ctx: { req, res }, cookie, clearCookie }
}

describe('AuthResolver.refresh', () => {
    it('does NOT emit any Set-Cookie when the refresh command fails (the web BFF reads Set-Cookie as its only success signal → a stray cookie loops it)', async () => {
        const commandBus = {
            execute: vi.fn().mockRejectedValue(new Error('INVALID_REFRESH_TOKEN')),
        } as unknown as CommandBus
        const queryBus = { execute: vi.fn() } as unknown as QueryBus
        const resolver = new AuthResolver(commandBus, queryBus, buildCookies())
        const { ctx, cookie, clearCookie } = fakeCtx()

        await expect(resolver.refresh(ctx)).rejects.toThrow('INVALID_REFRESH_TOKEN')

        // No fresh cookie, and — crucially — no cookie-clearing either: a rejected
        // refresh must leave the response cookie-free so the BFF routes it to /login.
        expect(cookie).not.toHaveBeenCalled()
        expect(clearCookie).not.toHaveBeenCalled()
    })

    it('throws before touching the command bus when no refresh cookie is present', async () => {
        const commandBus = { execute: vi.fn() } as unknown as CommandBus
        const queryBus = { execute: vi.fn() } as unknown as QueryBus
        const resolver = new AuthResolver(commandBus, queryBus, buildCookies())
        const { ctx, cookie, clearCookie } = fakeCtx()
        ;(ctx.req as unknown as { cookies: Record<string, string> }).cookies = {}

        await expect(resolver.refresh(ctx)).rejects.toThrow()

        expect(commandBus.execute).not.toHaveBeenCalled()
        expect(cookie).not.toHaveBeenCalled()
        expect(clearCookie).not.toHaveBeenCalled()
    })
})
