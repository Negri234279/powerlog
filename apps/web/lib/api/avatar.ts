import { refreshSession } from '@/lib/graphql/client'

/**
 * Avatar upload/removal is REST (multipart) — the sanctioned exception to the
 * all-GraphQL rule, since files don't fit GraphQL. We hit the same-origin BFF
 * path `/api/profile/avatar`, which next.config rewrites to the API, so the
 * HTTPOnly auth cookie stays first-party (no CORS). A 401 (expired access token)
 * is handled like `gqlRequest`: refresh once, then retry.
 */
const AVATAR_ENDPOINT = '/api/profile/avatar'

/** Subset of the API's ProfileView we rely on after an avatar change. */
export interface AvatarMutationResult {
    avatarUrl: string | null
}

async function parse(res: Response): Promise<AvatarMutationResult> {
    if (!res.ok) {
        const message = await res
            .json()
            .then((body: { message?: string }) => body.message)
            .catch(() => undefined)
        throw new Error(message ?? `Avatar request failed (${res.status}).`)
    }
    return (await res.json()) as AvatarMutationResult
}

/** Runs a request, transparently refreshing the session once on 401 and retrying. */
async function withRefresh(run: () => Promise<Response>): Promise<Response> {
    const res = await run()
    if (res.status !== 401) return res

    try {
        await refreshSession()
    } catch {
        return res
    }
    return run()
}

export async function uploadAvatar(blob: Blob): Promise<AvatarMutationResult> {
    const form = new FormData()
    form.append('file', blob, 'avatar.webp')

    const res = await withRefresh(() => fetch(AVATAR_ENDPOINT, { method: 'POST', body: form, credentials: 'include' }))
    return parse(res)
}

export async function removeAvatar(): Promise<AvatarMutationResult> {
    const res = await withRefresh(() => fetch(AVATAR_ENDPOINT, { method: 'DELETE', credentials: 'include' }))
    return parse(res)
}
