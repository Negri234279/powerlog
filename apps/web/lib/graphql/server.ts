import 'server-only'

import type { TypedDocumentNode } from '@graphql-typed-document-node/core'
import { print } from 'graphql'

import { serverEnv } from '@/lib/env.server'

/**
 * Typed GraphQL request from a Server Component.
 *
 * Not `gqlRequest` (lib/graphql/client): that one is the browser's, and it carries
 * the session — same-origin proxy, cookies, single-flight refresh. This one runs on
 * the server, talks to the API directly over the internal network, and is for
 * **public** data only: it sends no credentials, so anything it asks for must be
 * readable without a session.
 *
 * `revalidate` is why this exists at all. Next caches the fetch, so the price on the
 * landing is baked into the HTML (a crawler and a cold visitor both see it, with no
 * skeleton) and the API is hit once per window rather than once per visit — at the
 * cost of a catalog edit taking up to that long to show up.
 */
export async function gqlServerRequest<TResult, TVariables>(
    document: TypedDocumentNode<TResult, TVariables>,
    variables: TVariables,
    revalidateSeconds: number,
): Promise<TResult> {
    const response = await fetch(`${serverEnv.apiInternalUrl}/graphql`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: print(document), variables }),
        next: { revalidate: revalidateSeconds },
    })

    if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`)
    }

    const body = (await response.json()) as { data?: TResult; errors?: { message: string }[] }

    if (body.errors?.length) {
        throw new Error(body.errors.map((error) => error.message).join('; '))
    }

    if (!body.data) {
        throw new Error('GraphQL response carried no data.')
    }

    return body.data
}
