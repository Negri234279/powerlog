import type { ConfigService } from '@nestjs/config'
import type { CookieOptions, Response } from 'express'
import { describe, expect, it } from 'vitest'

import type { Env } from '../../../../config/env'
import { AuthCookies } from './auth-cookies'

const ACCESS = 'pl_at'
const REFRESH = 'pl_rt'
const DOMAIN = 'powerlog.negri.es'

type CookieCall = { name: string; value: string; opts?: CookieOptions }
type ClearCall = { name: string; opts?: CookieOptions }

function fakeResponse(): { res: Response; cookies: CookieCall[]; cleared: ClearCall[] } {
    const cookies: CookieCall[] = []
    const cleared: ClearCall[] = []
    const res = {
        cookie(name: string, value: string, opts?: CookieOptions) {
            cookies.push({ name, value, opts })
            return res
        },
        clearCookie(name: string, opts?: CookieOptions) {
            cleared.push({ name, opts })
            return res
        },
    } as unknown as Response

    return { res, cookies, cleared }
}

function buildCookies(overrides: Partial<Record<keyof Env, unknown>> = {}): AuthCookies {
    const values: Partial<Record<keyof Env, unknown>> = {
        AUTH_COOKIE_NAME: ACCESS,
        REFRESH_COOKIE_NAME: REFRESH,
        JWT_EXPIRES_IN: '15m',
        REFRESH_EXPIRES_IN: '30d',
        COOKIE_SECURE: true,
        COOKIE_DOMAIN: DOMAIN,
        ...overrides,
    }

    const config = { get: (key: keyof Env) => values[key] } as unknown as ConfigService<Env, true>

    return new AuthCookies(config)
}

describe('AuthCookies', () => {
    describe('with a legacy COOKIE_DOMAIN configured', () => {
        it('sets host-only session cookies and expires the shadowing Domain-scoped orphans', () => {
            const { res, cookies, cleared } = fakeResponse()

            buildCookies().setSession(res, { accessToken: 'access', refreshToken: 'refresh' })

            // Fresh cookies are host-only: no `domain` attribute.
            expect(cookies.map((c) => ({ name: c.name, value: c.value, domain: c.opts?.domain }))).toEqual([
                { name: ACCESS, value: 'access', domain: undefined },
                { name: REFRESH, value: 'refresh', domain: undefined },
            ])
            // A pre-migration Domain-scoped orphan of each name is expired so it can't
            // keep shadowing the fresh host-only cookie and failing every refresh.
            expect(cleared).toEqual([
                { name: ACCESS, opts: expect.objectContaining({ domain: DOMAIN }) },
                { name: REFRESH, opts: expect.objectContaining({ domain: DOMAIN }) },
            ])
        })

        it('expireLegacyDomainCookies drops only the Domain-scoped orphans, never the host-only cookies', () => {
            const { res, cookies, cleared } = fakeResponse()

            buildCookies().expireLegacyDomainCookies(res)

            expect(cookies).toEqual([])
            expect(cleared).toEqual([
                { name: ACCESS, opts: expect.objectContaining({ domain: DOMAIN }) },
                { name: REFRESH, opts: expect.objectContaining({ domain: DOMAIN }) },
            ])
        })

        it('clear() expires both the host-only cookies and the Domain-scoped orphans', () => {
            const { res, cleared } = fakeResponse()

            buildCookies().clear(res)

            expect(cleared).toEqual([
                { name: ACCESS, opts: expect.not.objectContaining({ domain: DOMAIN }) },
                { name: REFRESH, opts: expect.not.objectContaining({ domain: DOMAIN }) },
                { name: ACCESS, opts: expect.objectContaining({ domain: DOMAIN }) },
                { name: REFRESH, opts: expect.objectContaining({ domain: DOMAIN }) },
            ])
        })
    })

    describe('without COOKIE_DOMAIN (post-cleanup)', () => {
        it('setSession sets host-only cookies and touches no Domain scope', () => {
            const { res, cookies, cleared } = fakeResponse()

            buildCookies({ COOKIE_DOMAIN: undefined }).setSession(res, {
                accessToken: 'access',
                refreshToken: 'refresh',
            })

            expect(cookies).toHaveLength(2)
            expect(cleared).toEqual([])
        })

        it('expireLegacyDomainCookies is a no-op', () => {
            const { res, cleared } = fakeResponse()

            buildCookies({ COOKIE_DOMAIN: undefined }).expireLegacyDomainCookies(res)

            expect(cleared).toEqual([])
        })
    })
})
