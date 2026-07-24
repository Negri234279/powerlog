import { UnauthorizedException, UseGuards } from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql'
import { Throttle } from '@nestjs/throttler'
import type { Request, Response } from 'express'
import { z } from 'zod'

import type { AuthUser } from '../../../../auth/auth-user'
import { CurrentUser } from '../../../../auth/current-user.decorator'
import { JwtCookieGuard } from '../../../../auth/jwt-cookie.guard'
import { FindUserIdByHandleQuery } from '../../../../shared/contracts/find-user-id-by-handle.query'
import { ZodValidationPipe } from '../../../../shared/zod-validation.pipe'
import { BecomeCoachCommand } from '../../application/commands/become-coach/become-coach.command'
import { ChangePasswordCommand } from '../../application/commands/change-password/change-password.command'
import { DeleteAccountCommand } from '../../application/commands/delete-account/delete-account.command'
import { ForgotPasswordCommand } from '../../application/commands/forgot-password/forgot-password.command'
import { LoginCommand } from '../../application/commands/login/login.command'
import { LogoutCommand } from '../../application/commands/logout/logout.command'
import { RefreshSessionCommand } from '../../application/commands/refresh-session/refresh-session.command'
import { RegisterUserCommand } from '../../application/commands/register-user/register-user.command'
import { ResendEmailVerificationCommand } from '../../application/commands/resend-email-verification/resend-email-verification.command'
import { ResetPasswordCommand } from '../../application/commands/reset-password/reset-password.command'
import { RevokeOtherSessionsCommand } from '../../application/commands/revoke-other-sessions/revoke-other-sessions.command'
import { RevokeSessionCommand } from '../../application/commands/revoke-session/revoke-session.command'
import { VerifyEmailCommand } from '../../application/commands/verify-email/verify-email.command'
import { EmailAvailableQuery } from '../../application/queries/email-available/email-available.query'
import { GetMeQuery } from '../../application/queries/get-me/get-me.query'
import type { UserView } from '../../application/queries/get-me/get-me.handler'
import { GetMySessionsQuery } from '../../application/queries/get-my-sessions/get-my-sessions.query'
import type { SessionView } from '../../application/queries/get-my-sessions/get-my-sessions.handler'
import type { AuthSessionResult } from '../../application/results/auth-session.result'
import type { DeviceInfo } from '../../application/services/session-issuer.service'
import { AuthCookies } from '../cookies/auth-cookies'
import { ChangePasswordInput, changePasswordSchema } from '../inputs/change-password.input'
import { LoginInput, loginSchema } from '../inputs/login.input'
import { RegisterInput, registerSchema } from '../inputs/register.input'
import { ResetPasswordInput, forgotPasswordSchema, resetPasswordSchema } from '../inputs/reset-password.input'
import { MeType } from '../types/me.type'
import { SessionType } from '../types/session.type'

/** Per-route rate limits (per IP, per minute) for sensitive auth operations. */
const MINUTE = 60_000
const RATE = {
    register: { default: { ttl: MINUTE, limit: 5 } },
    login: { default: { ttl: MINUTE, limit: 10 } },
    verifyEmail: { default: { ttl: MINUTE, limit: 10 } },
    resend: { default: { ttl: MINUTE, limit: 3 } },
    changePassword: { default: { ttl: MINUTE, limit: 5 } },
    forgotPassword: { default: { ttl: MINUTE, limit: 5 } },
    resetPassword: { default: { ttl: MINUTE, limit: 10 } },
    // Registration availability probes fire as the user types (debounced), so they
    // need more headroom — but still bounded to blunt email enumeration.
    availability: { default: { ttl: MINUTE, limit: 30 } },
}

/** Argument schemas for the public availability probes (mirror registerSchema). */
const availabilityEmailSchema = z.email()
const availabilityUsernameSchema = z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/i)

interface GqlContext {
    req: Request
    res: Response
}

@Resolver(() => MeType)
export class AuthResolver {
    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly cookies: AuthCookies,
    ) {}

    @Throttle(RATE.register)
    @Mutation(() => MeType, { description: 'Register with email + password.' })
    async register(
        @Args('input', new ZodValidationPipe(registerSchema)) input: RegisterInput,
        @Context() ctx: GqlContext,
    ): Promise<MeType> {
        const command = new RegisterUserCommand(
            input.email,
            input.password,
            input.username,
            input.units,
            {
                firstName: input.firstName,
                lastName: input.lastName,
                birthDate: input.birthDate,
                heightCm: input.heightCm,
                locale: input.locale,
            },
            this.deviceFrom(ctx.req),
        )

        const result = await this.commandBus.execute<RegisterUserCommand, AuthSessionResult>(command)

        this.cookies.setSession(ctx.res, result)

        return this.loadMe(result.userId)
    }

    @Throttle(RATE.availability)
    @Query(() => Boolean, { description: 'Whether an email is free to register.' })
    async emailAvailable(
        @Args('email', new ZodValidationPipe(availabilityEmailSchema)) email: string,
    ): Promise<boolean> {
        const query = new EmailAvailableQuery(email)
        return this.queryBus.execute<EmailAvailableQuery, boolean>(query)
    }

    @Throttle(RATE.availability)
    @Query(() => Boolean, { description: 'Whether a public handle is free to register.' })
    async usernameAvailable(
        @Args('username', new ZodValidationPipe(availabilityUsernameSchema)) username: string,
    ): Promise<boolean> {
        const query = new FindUserIdByHandleQuery(username)
        const userId = await this.queryBus.execute<FindUserIdByHandleQuery, string | null>(query)
        return userId === null
    }

    @Throttle(RATE.login)
    @Mutation(() => MeType, { description: 'Log in with email + password.' })
    async login(
        @Args('input', new ZodValidationPipe(loginSchema)) input: LoginInput,
        @Context() ctx: GqlContext,
    ): Promise<MeType> {
        const command = new LoginCommand(input.email, input.password, this.deviceFrom(ctx.req))
        const result = await this.commandBus.execute<LoginCommand, AuthSessionResult>(command)

        this.cookies.setSession(ctx.res, result)

        return this.loadMe(result.userId)
    }

    @Mutation(() => MeType, {
        description: 'Rotate the session using the refresh cookie.',
    })
    async refresh(@Context() ctx: GqlContext): Promise<MeType> {
        const token = this.cookies.readRefresh(ctx.req)
        if (!token) {
            throw new UnauthorizedException('No refresh token.')
        }

        const command = new RefreshSessionCommand(token, this.deviceFrom(ctx.req))
        const result = await this.commandBus.execute<RefreshSessionCommand, AuthSessionResult>(command)

        this.cookies.setSession(ctx.res, result)

        return this.loadMe(result.userId)
    }

    @Mutation(() => Boolean, {
        description: 'Revoke the refresh token and clear the auth cookies.',
    })
    async logout(@Context() ctx: GqlContext): Promise<boolean> {
        const token = this.cookies.readRefresh(ctx.req)
        const command = new LogoutCommand(token)
        await this.commandBus.execute<LogoutCommand, void>(command)

        this.cookies.clear(ctx.res)

        return true
    }

    @Mutation(() => Boolean, {
        description: 'Permanently delete the current account (GDPR): soft-delete + scrub personal data.',
    })
    @UseGuards(JwtCookieGuard)
    async deleteAccount(@CurrentUser() user: AuthUser, @Context() ctx: GqlContext): Promise<boolean> {
        const command = new DeleteAccountCommand(user.userId)
        await this.commandBus.execute<DeleteAccountCommand, void>(command)

        this.cookies.clear(ctx.res)

        return true
    }

    @Throttle(RATE.verifyEmail)
    @Mutation(() => Boolean, {
        description: 'Confirm email ownership with the token from the verification email.',
    })
    async verifyEmail(@Args('token') token: string): Promise<boolean> {
        const command = new VerifyEmailCommand(token)
        await this.commandBus.execute<VerifyEmailCommand, void>(command)

        return true
    }

    @Throttle(RATE.resend)
    @Mutation(() => Boolean, { description: 'Resend the verification email to the current user.' })
    @UseGuards(JwtCookieGuard)
    async resendEmailVerification(@CurrentUser() user: AuthUser): Promise<boolean> {
        const command = new ResendEmailVerificationCommand(user.userId)
        await this.commandBus.execute<ResendEmailVerificationCommand, void>(command)

        return true
    }

    @Throttle(RATE.changePassword)
    @Mutation(() => Boolean, {
        description: 'Change (or set, for Google-only accounts) the password.',
    })
    @UseGuards(JwtCookieGuard)
    async changePassword(
        @CurrentUser() user: AuthUser,
        @Args('input', new ZodValidationPipe(changePasswordSchema)) input: ChangePasswordInput,
    ): Promise<boolean> {
        const command = new ChangePasswordCommand(user.userId, input.newPassword, input.currentPassword)
        await this.commandBus.execute<ChangePasswordCommand, void>(command)

        return true
    }

    @Throttle(RATE.forgotPassword)
    @Mutation(() => Boolean, {
        description: 'Email a password-reset link (always succeeds, even if the email is unknown).',
    })
    async forgotPassword(@Args('email', new ZodValidationPipe(forgotPasswordSchema)) email: string): Promise<boolean> {
        const command = new ForgotPasswordCommand(email)
        await this.commandBus.execute<ForgotPasswordCommand, void>(command)

        return true
    }

    @Throttle(RATE.resetPassword)
    @Mutation(() => Boolean, { description: 'Reset the password using the token from the reset email.' })
    async resetPassword(
        @Args('input', new ZodValidationPipe(resetPasswordSchema)) input: ResetPasswordInput,
    ): Promise<boolean> {
        const command = new ResetPasswordCommand(input.token, input.newPassword)
        await this.commandBus.execute<ResetPasswordCommand, void>(command)

        return true
    }

    @Mutation(() => MeType, {
        description: 'Promote the current user to coach (re-issues the session with the new role).',
    })
    @UseGuards(JwtCookieGuard)
    async becomeCoach(@CurrentUser() user: AuthUser, @Context() ctx: GqlContext): Promise<MeType> {
        const command = new BecomeCoachCommand(user.userId, this.deviceFrom(ctx.req))
        const result = await this.commandBus.execute<BecomeCoachCommand, AuthSessionResult>(command)

        this.cookies.setSession(ctx.res, result)

        return this.loadMe(result.userId)
    }

    @Query(() => MeType, { description: 'The currently authenticated user.' })
    @UseGuards(JwtCookieGuard)
    async me(@CurrentUser() user: AuthUser): Promise<MeType> {
        return this.loadMe(user.userId)
    }

    @Query(() => [SessionType], { description: 'The user’s active sessions (devices).' })
    @UseGuards(JwtCookieGuard)
    async mySessions(@CurrentUser() user: AuthUser, @Context() ctx: GqlContext): Promise<SessionType[]> {
        const query = new GetMySessionsQuery(user.userId, this.cookies.readRefresh(ctx.req))
        const views = await this.queryBus.execute<GetMySessionsQuery, SessionView[]>(query)

        return views.map((view) => Object.assign(new SessionType(), view))
    }

    @Mutation(() => Boolean, { description: 'Revoke one session by id (logs out that device).' })
    @UseGuards(JwtCookieGuard)
    async revokeSession(@CurrentUser() user: AuthUser, @Args('id') id: string): Promise<boolean> {
        const command = new RevokeSessionCommand(user.userId, id)
        await this.commandBus.execute<RevokeSessionCommand, void>(command)

        return true
    }

    @Mutation(() => Boolean, { description: 'Revoke every session except the current one.' })
    @UseGuards(JwtCookieGuard)
    async revokeOtherSessions(@CurrentUser() user: AuthUser, @Context() ctx: GqlContext): Promise<boolean> {
        const command = new RevokeOtherSessionsCommand(user.userId, this.cookies.readRefresh(ctx.req))
        await this.commandBus.execute<RevokeOtherSessionsCommand, void>(command)

        return true
    }

    private deviceFrom(req: Request): DeviceInfo {
        const userAgent = req.headers['user-agent']

        return {
            userAgent: typeof userAgent === 'string' ? userAgent : null,
            ip: req.ip ?? null,
        }
    }

    private async loadMe(userId: string): Promise<MeType> {
        const view = await this.queryBus.execute<GetMeQuery, UserView>(new GetMeQuery(userId))

        return Object.assign(new MeType(), view)
    }
}
