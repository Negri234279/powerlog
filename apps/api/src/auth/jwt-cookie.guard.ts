import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { type GqlContextType, GqlExecutionContext } from '@nestjs/graphql'
import { ClsService } from 'nestjs-cls'

import type { Env } from '../config/env'
import { TokenSigner } from '../modules/auth/application/ports/token-signer.port'
import type { AuthUser } from './auth-user'

interface RequestWithAuth {
    cookies?: Record<string, string | undefined>
    user?: AuthUser
}

/**
 * Authenticates a request from the access-token cookie (RS256, verified via the
 * TokenSigner port) and attaches the principal to `req.user`. Shared by every
 * feature module's resolvers; lives outside `src/modules` so importing it never
 * crosses a module boundary. Replaces the old StubAuthGuard.
 */
@Injectable()
export class JwtCookieGuard implements CanActivate {
    constructor(
        private readonly tokenSigner: TokenSigner,
        private readonly config: ConfigService<Env, true>,
        private readonly cls: ClsService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = this.getRequest(context)
        const cookieName = this.config.get('AUTH_COOKIE_NAME', { infer: true })
        const token = req.cookies?.[cookieName]
        if (!token) {
            throw new UnauthorizedException('Not authenticated.')
        }

        try {
            const claims = await this.tokenSigner.verifyAccessToken(token)
            req.user = {
                userId: claims.userId,
                email: claims.email,
                role: claims.role,
                isAdmin: claims.isAdmin,
                avatar: claims.avatar,
                locale: claims.locale,
            }

            // Surface the user on every subsequent log line for this request.
            if (this.cls.isActive()) {
                this.cls.set('userId', claims.userId)
            }

            return true
        } catch {
            throw new UnauthorizedException('Invalid or expired session.')
        }
    }

    private getRequest(context: ExecutionContext): RequestWithAuth {
        if (context.getType<GqlContextType>() === 'graphql') {
            return GqlExecutionContext.create(context).getContext<{
                req: RequestWithAuth
            }>().req
        }

        return context.switchToHttp().getRequest<RequestWithAuth>()
    }
}
