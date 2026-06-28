import 'server-only'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'
import { importSPKI, jwtVerify } from 'jose'

import { serverEnv } from '@/lib/env.server'

const ALG = 'RS256'

/** Server-side silent-refresh route (see app/api/auth/refresh/route.ts). */
const REFRESH_PATH = '/api/auth/refresh'

/** Roles carried by the access token, mirroring the API's UserRole VO. */
export type SessionRole = 'athlete' | 'coach'

/**
 * The authenticated principal as proven by a valid access-token cookie. This is
 * the subset of claims the API stamps into the RS256 JWT — enough to authorize
 * and gate by role/admin, but NOT the full profile (use `useMe` for that).
 */
export interface Session {
    userId: string
    email: string
    username: string
    role: SessionRole
    isAdmin: boolean
    /** Resolved avatar URL from the profile; null → show the default/initials. */
    avatar: string | null
}

let verifyKey: ReturnType<typeof importSPKI> | undefined

function getVerifyKey(): ReturnType<typeof importSPKI> {
    if (!verifyKey) {
        verifyKey = importSPKI(serverEnv.jwtPublicKeyPem, ALG)
    }

    return verifyKey
}

/**
 * Reads and verifies the access-token cookie locally (RS256, no network call to
 * the API) and returns the principal, or `null` when the cookie is absent,
 * expired, forged, or missing required claims.
 *
 * Memoised per request via React `cache()`, so multiple server components in the
 * same render verify the token only once. Authorization only — the access token
 * is short-lived, so an expired-but-refreshable session returns `null` here.
 * Optimistic reads tolerate that (the client refreshes single-flight); hard gates
 * use `requireSession`/`requireAdmin`, which bounce through the refresh route.
 */
export const getSession = cache(async (): Promise<Session | null> => {
    const token = (await cookies()).get(serverEnv.authCookieName)?.value
    if (!token) return null

    try {
        const { payload } = await jwtVerify(token, await getVerifyKey(), {
            algorithms: [ALG],
            issuer: serverEnv.jwtIssuer,
            audience: serverEnv.jwtAudience,
        })

        const { sub, email, username, role, isAdmin, avatar } = payload
        if (
            typeof sub !== 'string' ||
            typeof email !== 'string' ||
            typeof username !== 'string' ||
            (role !== 'athlete' && role !== 'coach') ||
            typeof isAdmin !== 'boolean' ||
            (avatar !== null && typeof avatar !== 'string')
        ) {
            return null
        }

        return { userId: sub, email, username, role, isAdmin, avatar }
    } catch {
        // Expired / invalid signature / wrong issuer-audience: not authenticated.
        return null
    }
})

/**
 * True when a refresh cookie is present. Lets callers tell "no session at all"
 * (redirect to login) apart from "access expired but still refreshable" (let the
 * client refresh) without trusting the cookie's contents.
 */
export async function hasRefreshCookie(): Promise<boolean> {
    return (await cookies()).has(serverEnv.refreshCookieName)
}

/**
 * Hard auth gate for a server component. Returns the verified session, or never
 * returns: a refreshable-but-expired access token bounces through the silent
 * refresh route (which rotates the cookies and returns to `next`), and a truly
 * absent session goes to /login. `next` is the path to come back to (the caller's
 * own route), so the refreshed render lands where the user was headed.
 */
export async function requireSession(next: string): Promise<Session> {
    const session = await getSession()
    if (session) return session

    if (await hasRefreshCookie()) {
        redirect(`${REFRESH_PATH}?next=${encodeURIComponent(next)}`)
    }
    redirect('/login')
}

/** Hard gate for admin-only routes. Non-admins are sent to /dashboard. */
export async function requireAdmin(next: string): Promise<Session> {
    const session = await requireSession(next)
    if (!session.isAdmin) redirect('/dashboard')

    return session
}

/** Hard gate for a specific role (e.g. coach-only routes). */
export async function requireRole(role: SessionRole, next: string): Promise<Session> {
    const session = await requireSession(next)
    if (session.role !== role) redirect('/dashboard')

    return session
}
