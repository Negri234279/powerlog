import type { ExecutionContext } from '@nestjs/common'
import { describe, expect, it } from 'vitest'

import { gqlReqRes } from './gql-throttler.guard'

function contextStub(args: unknown[], http?: { req: unknown; res: unknown }): ExecutionContext {
    return {
        getArgs: () => args,
        getArgByIndex: (i: number) => args[i],
        getType: () => 'graphql',
        getClass: () => class {},
        getHandler: () => function handler() {},
        switchToHttp: () => ({
            getRequest: () => http?.req,
            getResponse: () => http?.res,
            getNext: () => undefined,
        }),
        switchToRpc: () => ({ getData: () => ({}), getContext: () => ({}) }),
        switchToWs: () => ({ getClient: () => ({}), getData: () => ({}), getPattern: () => '' }),
    } as unknown as ExecutionContext
}

describe('gqlReqRes', () => {
    it('extracts req/res from the GraphQL context (4 resolver args)', () => {
        const req = { ip: '1.1.1.1' }
        const res = { setHeader: () => undefined }
        const result = gqlReqRes(contextStub([null, null, { req, res }, null]))
        expect(result.req).toBe(req)
        expect(result.res).toBe(res)
    })

    it('falls back to the HTTP context for REST requests (3 args)', () => {
        const req = { ip: '2.2.2.2' }
        const res = { setHeader: () => undefined }
        // REST execution context: getArgs() === [req, res, next].
        const result = gqlReqRes(contextStub([req, res, () => undefined], { req, res }))
        expect(result.req).toBe(req)
        expect(result.res).toBe(res)
    })
})
