import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { CookieOptions, Request, Response } from 'express'

import type { Env } from '../../../../config/env'
import { parseDurationMs } from '../../../../shared/duration'
import type { AuthSessionResult } from '../../application/results/auth-session.result'

type SessionTokens = Pick<AuthSessionResult, 'accessToken' | 'refreshToken'>

/**
 * Sets/clears the HTTPOnly auth cookies (access + refresh). SameSite=Lax;
 * `secure`/`domain` come from config. Shared by the resolver and the OAuth
 * controller — the only places that touch `res`.
 */
@Injectable()
export class AuthCookies {
    private get accessName(): string {
        return this.config.get('AUTH_COOKIE_NAME', { infer: true })
    }

    private get refreshName(): string {
        return this.config.get('REFRESH_COOKIE_NAME', { infer: true })
    }

    private get accessMaxAge(): number {
        return parseDurationMs(this.config.get('JWT_EXPIRES_IN', { infer: true }))
    }

    private get refreshMaxAge(): number {
        return parseDurationMs(this.config.get('REFRESH_EXPIRES_IN', { infer: true }))
    }

    // The Domain the cookies were set with *before* the host-only switch. Kept only
    // so `clear()` can expire those legacy Domain-scoped cookies; not used to set.
    // Remove (with the COOKIE_DOMAIN env) once all such cookies have expired (~30d).
    private get legacyDomain(): string | undefined {
        return this.config.get('COOKIE_DOMAIN', { infer: true })
    }

    constructor(private readonly config: ConfigService<Env, true>) {}

    setSession(res: Response, tokens: SessionTokens): void {
        res.cookie(this.accessName, tokens.accessToken, this.options(this.accessMaxAge))
        res.cookie(this.refreshName, tokens.refreshToken, this.options(this.refreshMaxAge))

        // Kill any legacy Domain-scoped orphan on the way out: we only set host-only
        // cookies now, so a Domain-scoped pl_at/pl_rt is always a pre-migration orphan
        // that shadows the fresh host-only cookie. Expiring it on every successful auth
        // lets an affected device self-heal on its next login/refresh.
        this.expireLegacyDomainCookies(res)
    }

    clear(res: Response): void {
        // clearCookie must match the attributes the cookie was set with.
        const base = this.options()
        res.clearCookie(this.accessName, base)
        res.clearCookie(this.refreshName, base)

        this.expireLegacyDomainCookies(res)
    }

    // Expire the Domain-scoped auth cookies from before the host-only switch. A cookie
    // is only deleted by a Set-Cookie carrying the SAME Domain it was set with, so
    // without this an orphaned Domain-scoped pl_rt survives, shadows the fresh
    // host-only cookie, and every refresh fails (INVALID_REFRESH_TOKEN → the user is
    // logged out every couple of hours). Safe to call on any set/clear because we no
    // longer set Domain-scoped cookies. It leaves the host-only cookies untouched, so
    // the failing-refresh path can call it to drop *only* the shadowing orphan and let
    // the retry succeed with the still-valid host-only cookie. Remove (with the
    // COOKIE_DOMAIN env) once all such cookies have expired (~30d after the switch).
    expireLegacyDomainCookies(res: Response): void {
        if (!this.legacyDomain) return

        const domainScoped = { ...this.options(), domain: this.legacyDomain }
        res.clearCookie(this.accessName, domainScoped)
        res.clearCookie(this.refreshName, domainScoped)
    }

    readRefresh(req: Request): string | undefined {
        const cookies = req.cookies as Record<string, string | undefined> | undefined
        return cookies?.[this.refreshName]
    }

    // Host-only cookies: no `domain`. Setting a Domain made the browser store a
    // second, separately-scoped cookie; an orphaned copy then shadowed the valid one
    // and broke refresh. Everything is first-party to the web origin, so Domain buys
    // nothing. Legacy Domain-scoped cookies are expired in `clear()`.
    private options(maxAge?: number): CookieOptions {
        return {
            httpOnly: true,
            sameSite: 'lax',
            secure: this.config.get('COOKIE_SECURE', { infer: true }),
            path: '/',
            ...(maxAge !== undefined ? { maxAge } : {}),
        }
    }
}
