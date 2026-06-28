import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { type GqlContextType, GqlExecutionContext } from '@nestjs/graphql'

import type { UserRoleValue } from '../modules/auth/domain/value-objects/user-role.vo'
import type { AuthUser } from './auth-user'
import { ROLES_KEY } from './roles.decorator'

interface RequestWithAuth {
    user?: AuthUser
}

/**
 * Authorizes a request against the `@Roles(...)` metadata using the principal
 * `JwtCookieGuard` already attached. Runs after it: `@UseGuards(JwtCookieGuard,
 * RolesGuard)`. No metadata → allow (the guard is a no-op without `@Roles`).
 */
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const roles = this.reflector.getAllAndOverride<UserRoleValue[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ])
        if (!roles || roles.length === 0) return true

        const { user } = this.getRequest(context)
        if (!user || !roles.includes(user.role)) {
            throw new ForbiddenException('Insufficient role.')
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
