import { type ExecutionContext, Injectable } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql'
import { ThrottlerGuard } from '@nestjs/throttler'

type ReqRes = {
    req: Record<string, unknown>
    res: Record<string, unknown>
}

/**
 * Extracts req/res from either a GraphQL or an HTTP execution context, so the
 * throttler can rate-limit GraphQL resolvers (single POST /graphql) as well as
 * REST controllers. Exported for unit testing.
 */
export function gqlReqRes(context: ExecutionContext): ReqRes {
    const gqlContext = GqlExecutionContext.create(context).getContext<Partial<ReqRes>>()
    if (gqlContext?.req && gqlContext.res) {
        return {
            req: gqlContext.req,
            res: gqlContext.res,
        }
    }

    return {
        req: context.switchToHttp().getRequest<Record<string, unknown>>(),
        res: context.switchToHttp().getResponse<Record<string, unknown>>(),
    }
}

/** ThrottlerGuard that understands the GraphQL execution context. */
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
    protected override getRequestResponse(context: ExecutionContext): ReqRes {
        return gqlReqRes(context)
    }
}
