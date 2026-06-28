import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { type GqlContextType, GqlExecutionContext } from '@nestjs/graphql'

import type { AuthUser } from './auth-user'

interface RequestWithAuth {
    user?: AuthUser
}

/**
 * Authorizes a request to admin-only operations using the principal
 * `JwtCookieGuard` already attached. Runs after it: `@UseGuards(JwtCookieGuard,
 * AdminGuard)`. The `isAdmin` claim comes from the validated JWT, so the check is
 * subject to the ≤15m access-token staleness window. This is the authoritative
 * gate — any client-side admin gating is UX only.
 */
@Injectable()
export class AdminGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const { user } = this.getRequest(context)
        if (!user?.isAdmin) {
            throw new ForbiddenException('Administrator access required.')
        }

        return true
    }

    private getRequest(context: ExecutionContext): RequestWithAuth {
        if (context.getType<GqlContextType>() === 'graphql') {
            return GqlExecutionContext.create(context).getContext<{ req: RequestWithAuth }>().req
        }

        return context.switchToHttp().getRequest<RequestWithAuth>()
    }
}
