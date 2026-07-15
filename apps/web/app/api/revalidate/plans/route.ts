import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { getSession } from '@/lib/auth/session'

// Node runtime: getSession verifies the RS256 access token, which reads the
// server-only env (PEM via fs) — not available on the Edge runtime.
export const runtime = 'nodejs'

/**
 * On-demand ISR: drop the marketing pages' cached render so a plan/price edit shows
 * publicly at once, instead of waiting out the time-based window. The web admin
 * calls this after a successful catalog mutation. Both locale homes carry the plan
 * catalog, so both are revalidated.
 *
 * Same-origin and admin-gated: only a verified admin access token can trigger it, so
 * it isn't an open cache-buster. A failed refresh (expired token) simply 401s and the
 * caller drops it — the time-based revalidate is the backstop either way.
 */
export async function POST(): Promise<NextResponse> {
    const session = await getSession()
    if (!session) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    }
    if (!session.isAdmin) {
        return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    revalidatePath('/', 'page')
    revalidatePath('/es', 'page')

    return NextResponse.json({ revalidated: true })
}
