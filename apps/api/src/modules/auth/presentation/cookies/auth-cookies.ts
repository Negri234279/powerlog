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

    constructor(private readonly config: ConfigService<Env, true>) {}

    setSession(res: Response, tokens: SessionTokens): void {
        res.cookie(this.accessName, tokens.accessToken, this.options(this.accessMaxAge))
        res.cookie(this.refreshName, tokens.refreshToken, this.options(this.refreshMaxAge))
    }

    clear(res: Response): void {
        // clearCookie must match the attributes the cookie was set with.
        const base = this.options()
        res.clearCookie(this.accessName, base)
        res.clearCookie(this.refreshName, base)
    }

    readRefresh(req: Request): string | undefined {
        const cookies = req.cookies as Record<string, string | undefined> | undefined
        return cookies?.[this.refreshName]
    }

    private options(maxAge?: number): CookieOptions {
        return {
            httpOnly: true,
            sameSite: 'lax',
            secure: this.config.get('COOKIE_SECURE', { infer: true }),
            domain: this.config.get('COOKIE_DOMAIN', { infer: true }),
            path: '/',
            ...(maxAge !== undefined ? { maxAge } : {}),
        }
    }
}
