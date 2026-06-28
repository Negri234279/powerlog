import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CommandBus } from '@nestjs/cqrs'
import { AuthGuard } from '@nestjs/passport'
import type { Request, Response } from 'express'

import type { Env } from '../../../../config/env'
import type { GoogleProfile } from '../../application/commands/login-with-google/google-profile'
import { LoginWithGoogleCommand } from '../../application/commands/login-with-google/login-with-google.command'
import type { AuthSessionResult } from '../../application/results/auth-session.result'
import { AuthCookies } from '../cookies/auth-cookies'

/**
 * Google OAuth endpoints. REST is the sanctioned exception to "everything in
 * GraphQL": the callback is a browser redirect, not a GraphQL operation.
 * `AuthGuard("google")` drives the GoogleStrategy (code exchange).
 */
@Controller('auth/google')
export class GoogleOAuthController {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly cookies: AuthCookies,
        private readonly config: ConfigService<Env, true>,
    ) {}

    @Get()
    @UseGuards(AuthGuard('google'))
    start(): void {
        // The guard redirects to Google's consent screen; nothing to do here.
    }

    @Get('callback')
    @UseGuards(AuthGuard('google'))
    async callback(@Req() req: Request, @Res() res: Response): Promise<void> {
        const profile = req.user as GoogleProfile
        const webOrigin = this.config.get('WEB_ORIGIN', { infer: true })
        try {
            const result = await this.commandBus.execute<LoginWithGoogleCommand, AuthSessionResult>(
                new LoginWithGoogleCommand(
                    profile.googleId,
                    profile.email,
                    profile.displayName,
                    profile.firstName,
                    profile.lastName,
                    profile.pictureUrl,
                    {
                        userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
                        ip: req.ip ?? null,
                    },
                ),
            )
            this.cookies.setSession(res, result)
            res.redirect(webOrigin)
        } catch {
            res.redirect(`${webOrigin}/login?error=oauth`)
        }
    }
}
