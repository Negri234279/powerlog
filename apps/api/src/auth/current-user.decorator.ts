import { createParamDecorator, type ExecutionContext } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'

import type { AuthUser } from './auth-user'

/**
 * Injects the authenticated user into a resolver argument.
 * Populated by `JwtCookieGuard`.
 */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => {
    const ctx = GqlExecutionContext.create(context)
    return ctx.getContext<{ req: { user: AuthUser } }>().req.user
})
