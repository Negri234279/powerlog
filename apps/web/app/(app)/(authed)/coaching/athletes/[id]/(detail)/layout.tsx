import { getTranslations } from 'next-intl/server'

import { requireRole } from '@/lib/auth/session'
import { AthleteHeader } from '@/components/coaching/athlete-header'
import { AthleteNav } from '@/components/coaching/athlete-nav'
import { AthleteNote } from '@/components/coaching/athlete-note'
import { TrackedLink } from '@/components/ui/tracked'

/**
 * Shell for the athlete detail area: identity, sub-nav and the surface card stay
 * mounted while the section (Training / Stats / Plan / Note) swaps underneath via
 * nested routes.
 *
 * It lives in a `(detail)` route group on purpose. The sibling routes under
 * `[id]/` — `workouts/[sessionId]` and `mesocycles/*` — are full-page editors
 * that must NOT inherit this chrome; the group scopes the layout to the detail
 * sections without changing a single URL.
 *
 * `requireRole` is the authoritative gate: a non-coach never renders the UI at
 * all. The old client-side `me?.role === 'coach'` check flashed "coaches only"
 * on every cold load, because a still-loading `me` is indistinguishable from a
 * denied one. The API enforces the same rule on every coaching operation — this
 * is defence-in-depth, not the only barrier.
 *
 * When the realtime chat lands, its rail goes here (a second grid column beside
 * `{children}` from `xl` up): mounted by the layout, it survives section changes,
 * so the SSE subscription and the unread count don't reset on every navigation.
 */
export default async function AthleteDetailLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    await requireRole('coach', `/coaching/athletes/${id}`)

    const t = await getTranslations('coaching')

    return (
        <div className="space-y-6">
            <TrackedLink
                analyticsId="athlete-back"
                href="/coaching"
                className="font-mono text-eyebrow uppercase text-text-faint transition-colors duration-300 hover:text-text-dim"
            >
                {t('backToCoaching')}
            </TrackedLink>

            <AthleteHeader athleteId={id} />

            <AthleteNote athleteId={id} />

            <AthleteNav athleteId={id} />

            <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
                <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-6 md:p-8">{children}</div>
            </div>
        </div>
    )
}
