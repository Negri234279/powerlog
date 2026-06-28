import { requireAdmin } from '@/lib/auth/session'

/**
 * Authoritative server-side gate for every /admin route. Non-admins never reach
 * the admin UI: `requireAdmin` verifies the access token (RS256), bounces an
 * expired-but-refreshable session through the refresh route, and redirects
 * non-admins to /dashboard. The API enforces the same `isAdmin` check on every
 * admin operation — this is defence-in-depth, not the only barrier.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    await requireAdmin('/admin')

    return children
}
