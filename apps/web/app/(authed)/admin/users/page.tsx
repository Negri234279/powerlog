'use client'

import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { gqlErrorMessage } from '@/lib/graphql/error'
import { useMe } from '@/lib/graphql/hooks/use-auth'
import {
    type AdminUser,
    useAdminUsers,
    useSetUserAdmin,
    useSetUserRole,
    useSetUserStatus,
} from '@/lib/graphql/hooks/use-admin-users'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { AdminTabs } from '@/components/admin/admin-tabs'
import { ClearableSearch } from '@/components/ui/clearable-search'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { Select } from '@/components/ui/field'
import { FormError } from '@/components/ui/form-error'
import { Check } from '@/components/ui/icons'
import { MultiSelect } from '@/components/ui/multi-select'
import { Skeleton } from '@/components/ui/skeleton'
import { TextsReveal } from '@/components/ui/texts-reveal'
import { Tooltip } from '@/components/ui/tooltip'
import { TrackedButton } from '@/components/ui/tracked'

const ROLE_OPTIONS = [
    { value: 'athlete', label: 'Athlete' },
    { value: 'coach', label: 'Coach' },
]
const STATUS_OPTIONS = [
    { value: 'active', label: 'Active' },
    { value: 'disabled', label: 'Disabled' },
    { value: 'deleted', label: 'Deleted' },
]

export default function AdminUsersPage() {
    const { data: me } = useMe()
    const [rawSearch, setRawSearch] = useState('')
    const search = useDebouncedValue(rawSearch, 250)
    const [roles, setRoles] = useState<string[]>([])
    const [statuses, setStatuses] = useState<string[]>([])
    const [adminsOnly, setAdminsOnly] = useState(false)

    const [error, setError] = useState<string | null>(null)
    const [adminTarget, setAdminTarget] = useState<{ user: AdminUser; next: boolean } | null>(null)
    const [statusTarget, setStatusTarget] = useState<{ user: AdminUser; disable: boolean } | null>(null)

    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAdminUsers({
        search,
        roles,
        statuses,
        isAdmin: adminsOnly ? true : null,
    })
    const rows = data?.pages.flatMap((p) => p.rows) ?? []
    const total = data?.pages[0]?.total ?? 0

    const setRole = useSetUserRole()
    const setAdmin = useSetUserAdmin()
    const setStatus = useSetUserStatus()

    // Infinite scroll: load the next page when the sentinel scrolls into view.
    const sentinelRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const el = sentinelRef.current
        if (!el || !hasNextPage) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && !isFetchingNextPage) void fetchNextPage()
            },
            { rootMargin: '400px' },
        )
        observer.observe(el)

        return () => observer.disconnect()
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])

    async function changeRole(user: AdminUser, role: string) {
        setError(null)
        try {
            await setRole.mutateAsync({ userId: user.id, role })
        } catch (err) {
            setError(gqlErrorMessage(err))
        }
    }

    async function confirmAdmin() {
        if (!adminTarget) return
        setError(null)
        try {
            await setAdmin.mutateAsync({ userId: adminTarget.user.id, isAdmin: adminTarget.next })
            setAdminTarget(null)
        } catch (err) {
            setError(gqlErrorMessage(err))
        }
    }

    async function confirmStatus() {
        if (!statusTarget) return
        setError(null)
        try {
            await setStatus.mutateAsync({ userId: statusTarget.user.id, disabled: statusTarget.disable })
            setStatusTarget(null)
        } catch (err) {
            setError(gqlErrorMessage(err))
        }
    }

    return (
        <div>
            <TextsReveal>
                <p className="font-mono text-eyebrow uppercase text-text-faint">Admin</p>
                <h1 className="mt-1 font-display text-h2 tracking-tight">Users</h1>
            </TextsReveal>

            <div className="mt-8">
                <AdminTabs />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
                <ClearableSearch
                    analyticsId="admin-users-search"
                    value={rawSearch}
                    onChange={setRawSearch}
                    placeholder="Search email…"
                    className="w-64"
                />
                <MultiSelect
                    analyticsId="admin-users-filter-role"
                    label="Role"
                    options={ROLE_OPTIONS}
                    selected={roles}
                    onChange={setRoles}
                />
                <MultiSelect
                    analyticsId="admin-users-filter-status"
                    label="Status"
                    options={STATUS_OPTIONS}
                    selected={statuses}
                    onChange={setStatuses}
                />
                <TrackedButton
                    analyticsId="admin-users-filter-admins"
                    type="button"
                    onClick={() => setAdminsOnly((v) => !v)}
                    className={cn(
                        'rounded-full px-3.5 py-1.5 text-sm ring-1 transition-colors duration-300',
                        adminsOnly
                            ? 'bg-ember/10 text-ember ring-ember/30'
                            : 'text-text-dim ring-hairline hover:bg-white/[0.04] hover:text-text',
                    )}
                >
                    Admins only
                </TrackedButton>
            </div>

            <FormError error={error} className="mt-4" />

            {/* Table — a real <table> keeps header/body columns + vertical padding aligned. */}
            <div className="mt-6 overflow-x-auto rounded-2xl ring-1 ring-hairline">
                <table className="w-full min-w-[44rem] table-fixed border-collapse text-sm">
                    <thead>
                        <tr className="bg-white/[0.02] text-left font-mono text-eyebrow uppercase text-text-faint">
                            <th className="px-5 py-3 font-normal">User</th>
                            <th className="w-40 px-5 py-3 font-normal">Role</th>
                            <th className="w-36 px-5 py-3 font-normal">Status</th>
                            <th className="w-44 px-5 py-3 text-right font-normal">Admin</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={4} className="p-3">
                                    <div className="space-y-2">
                                        {Array.from({ length: 6 }).map((_, i) => (
                                            <Skeleton key={i} className="h-12" />
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-5 py-8 text-text-dim">
                                    No users match these filters.
                                </td>
                            </tr>
                        ) : (
                            <>
                                {rows.map((user) => {
                                    const isSelf = user.id === me?.id
                                    return (
                                        <tr key={user.id} className="border-t border-hairline">
                                            <td className="px-5 py-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-text">
                                                        {user.username ? `@${user.username}` : '—'}
                                                    </p>
                                                    <div className="flex min-w-0 items-center gap-1.5">
                                                        <Tooltip
                                                            label={
                                                                user.emailVerified
                                                                    ? 'Email verified'
                                                                    : 'Email not verified'
                                                            }
                                                        >
                                                            {user.emailVerified ? (
                                                                <Check className="size-3.5 shrink-0 text-pr" />
                                                            ) : (
                                                                <span className="block size-1.5 shrink-0 rounded-full bg-amber" />
                                                            )}
                                                        </Tooltip>
                                                        <p
                                                            className={cn(
                                                                'truncate font-mono text-xs',
                                                                user.emailVerified
                                                                    ? 'text-text-dim'
                                                                    : 'text-text-faint',
                                                            )}
                                                        >
                                                            {user.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <Select
                                                    value={user.role}
                                                    disabled={user.status === 'deleted'}
                                                    onChange={(e) => changeRole(user, e.target.value)}
                                                    className="py-1.5 text-xs"
                                                >
                                                    <option value="athlete">Athlete</option>
                                                    <option value="coach">Coach</option>
                                                </Select>
                                            </td>
                                            <td className="px-5 py-3">
                                                {user.status === 'deleted' ? (
                                                    <span className="text-text-faint">deleted</span>
                                                ) : (
                                                    (() => {
                                                        const statusButton = (
                                                            <TrackedButton
                                                                analyticsId="admin-user-status-toggle"
                                                                type="button"
                                                                disabled={isSelf}
                                                                onClick={() =>
                                                                    setStatusTarget({
                                                                        user,
                                                                        disable: user.status === 'active',
                                                                    })
                                                                }
                                                                className={cn(
                                                                    'rounded-full px-2.5 py-0.5 text-xs capitalize ring-1 transition-colors duration-300 disabled:opacity-40',
                                                                    user.status === 'active'
                                                                        ? 'bg-pr/10 text-pr ring-pr/30 hover:bg-pr/20'
                                                                        : 'bg-amber/10 text-amber ring-amber/30 hover:bg-amber/20',
                                                                )}
                                                            >
                                                                {user.status}
                                                            </TrackedButton>
                                                        )
                                                        return isSelf ? (
                                                            <Tooltip label="You can't disable your own account">
                                                                {statusButton}
                                                            </Tooltip>
                                                        ) : (
                                                            statusButton
                                                        )
                                                    })()
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                {(() => {
                                                    const adminButton = (
                                                        <TrackedButton
                                                            analyticsId="admin-user-admin-toggle"
                                                            type="button"
                                                            disabled={isSelf && user.isAdmin}
                                                            onClick={() =>
                                                                setAdminTarget({ user, next: !user.isAdmin })
                                                            }
                                                            className={cn(
                                                                'min-w-[7rem] rounded-full px-3 py-1 text-center text-xs ring-1 transition-colors duration-300 disabled:opacity-40',
                                                                user.isAdmin
                                                                    ? 'bg-ember/10 text-ember ring-ember/30 hover:bg-ember/20'
                                                                    : 'text-text-dim ring-hairline hover:bg-white/[0.04] hover:text-text',
                                                            )}
                                                        >
                                                            {user.isAdmin ? 'Admin' : 'Make admin'}
                                                        </TrackedButton>
                                                    )
                                                    return isSelf && user.isAdmin ? (
                                                        <Tooltip label="You can't revoke your own admin">
                                                            {adminButton}
                                                        </Tooltip>
                                                    ) : (
                                                        adminButton
                                                    )
                                                })()}
                                            </td>
                                        </tr>
                                    )
                                })}

                                {isFetchingNextPage ? (
                                    <tr>
                                        <td colSpan={4} className="border-t border-hairline p-3">
                                            <div className="space-y-2">
                                                {Array.from({ length: 3 }).map((_, i) => (
                                                    <Skeleton key={i} className="h-12" />
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ) : null}
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Infinite-scroll trigger. */}
            <div ref={sentinelRef} aria-hidden />

            {!isLoading && rows.length > 0 ? (
                <p className="mt-3 text-right font-mono text-xs text-text-faint">
                    {rows.length} of {total}
                </p>
            ) : null}

            <ConfirmModal
                analyticsId="admin-user-admin"
                open={adminTarget != null}
                onClose={() => {
                    setError(null)
                    setAdminTarget(null)
                }}
                onConfirm={confirmAdmin}
                title={adminTarget?.next ? 'Grant admin access?' : 'Revoke admin access?'}
                description={
                    adminTarget
                        ? `${adminTarget.user.username ? `@${adminTarget.user.username}` : adminTarget.user.email} will ${adminTarget.next ? 'gain' : 'lose'} full admin privileges.`
                        : undefined
                }
                confirmLabel={adminTarget?.next ? 'Grant' : 'Revoke'}
                destructive={!adminTarget?.next}
                pending={setAdmin.isPending}
                error={error}
            />

            <ConfirmModal
                analyticsId="admin-user-status"
                open={statusTarget != null}
                onClose={() => {
                    setError(null)
                    setStatusTarget(null)
                }}
                onConfirm={confirmStatus}
                title={statusTarget?.disable ? 'Disable account?' : 'Re-enable account?'}
                description={
                    statusTarget
                        ? statusTarget.disable
                            ? `${statusTarget.user.username ? `@${statusTarget.user.username}` : statusTarget.user.email} will be signed out and unable to log in until re-enabled.`
                            : `${statusTarget.user.username ? `@${statusTarget.user.username}` : statusTarget.user.email} will be able to log in again.`
                        : undefined
                }
                confirmLabel={statusTarget?.disable ? 'Disable' : 'Re-enable'}
                destructive={statusTarget?.disable}
                pending={setStatus.isPending}
                error={error}
            />
        </div>
    )
}
