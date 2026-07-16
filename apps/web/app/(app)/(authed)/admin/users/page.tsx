'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/cn'
import { useErrorMessage } from '@/lib/graphql/use-error-message'
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

/** User identity — username with the email + verification indicator beneath. */
function UserIdentity({ user }: { user: AdminUser }) {
    const t = useTranslations('admin')

    return (
        <div className="min-w-0">
            <p className="truncate text-text">{user.username ? `@${user.username}` : '—'}</p>
            <div className="flex min-w-0 items-center gap-1.5">
                <Tooltip label={user.emailVerified ? t('emailVerified') : t('emailNotVerified')}>
                    {user.emailVerified ? (
                        <Check className="size-3.5 shrink-0 text-pr" />
                    ) : (
                        <span className="block size-1.5 shrink-0 rounded-full bg-amber" />
                    )}
                </Tooltip>
                <p
                    className={cn(
                        'truncate font-mono text-xs',
                        user.emailVerified ? 'text-text-dim' : 'text-text-faint',
                    )}
                >
                    {user.email}
                </p>
            </div>
        </div>
    )
}

/** Athlete/coach role selector. */
function RoleControl({ user, onChange }: { user: AdminUser; onChange: (role: string) => void }) {
    const tc = useTranslations('common.role')

    return (
        <Select
            value={user.role}
            disabled={user.status === 'deleted'}
            onChange={(e) => onChange(e.target.value)}
            className="py-1.5 text-xs"
        >
            <option value="athlete">{tc('athlete')}</option>
            <option value="coach">{tc('coach')}</option>
        </Select>
    )
}

/**
 * The plan in force, as a read-only pill — read-only because this is not where a
 * plan is granted: that lives in `/admin/subscriptions`, which can also revoke it
 * and knows whether a gateway is charging for it.
 *
 * A free plan is muted and a paid one is highlighted, so a page of users shows at
 * a glance who is paying. `null` means billing couldn't answer (a broken catalog),
 * which is not the same as "no plan" and must not read like it.
 */
function PlanBadge({ plan }: { plan: string | null }) {
    if (plan === null) return <span className="text-text-faint">—</span>

    const free = plan.endsWith('-free')

    return (
        <span
            title={plan}
            className={cn(
                'inline-block max-w-full truncate rounded-full px-2.5 py-0.5 font-mono text-xs',
                free ? 'text-text-dim ring-1 ring-hairline' : 'bg-ember/10 text-ember ring-1 ring-ember/30',
            )}
        >
            {plan}
        </span>
    )
}

/** Active/disabled status pill (or a plain label for deleted accounts). */
function StatusControl({ user, isSelf, onToggle }: { user: AdminUser; isSelf: boolean; onToggle: () => void }) {
    const t = useTranslations('admin')

    if (user.status === 'deleted') return <span className="text-text-faint">{t('statusDeleted')}</span>

    const label = user.status === 'active' ? t('statusActive') : t('statusDisabled')
    const button = (
        <TrackedButton
            analyticsId="admin-user-status-toggle"
            type="button"
            disabled={isSelf}
            onClick={onToggle}
            className={cn(
                'rounded-full px-2.5 py-0.5 text-xs ring-1 transition-colors duration-300 disabled:opacity-40',
                user.status === 'active'
                    ? 'bg-pr/10 text-pr ring-pr/30 hover:bg-pr/20'
                    : 'bg-amber/10 text-amber ring-amber/30 hover:bg-amber/20',
            )}
        >
            {label}
        </TrackedButton>
    )

    return isSelf ? <Tooltip label={t('cantDisableSelf')}>{button}</Tooltip> : button
}

/** Grant/revoke admin toggle. */
function AdminControl({ user, isSelf, onToggle }: { user: AdminUser; isSelf: boolean; onToggle: () => void }) {
    const t = useTranslations('admin')

    const button = (
        <TrackedButton
            analyticsId="admin-user-admin-toggle"
            type="button"
            disabled={isSelf && user.isAdmin}
            onClick={onToggle}
            className={cn(
                'min-w-[7rem] rounded-full px-3 py-1 text-center text-xs ring-1 transition-colors duration-300 disabled:opacity-40',
                user.isAdmin
                    ? 'bg-ember/10 text-ember ring-ember/30 hover:bg-ember/20'
                    : 'text-text-dim ring-hairline hover:bg-white/[0.04] hover:text-text',
            )}
        >
            {user.isAdmin ? t('admin') : t('makeAdmin')}
        </TrackedButton>
    )

    return isSelf && user.isAdmin ? <Tooltip label={t('cantRevokeSelf')}>{button}</Tooltip> : button
}

export default function AdminUsersPage() {
    const t = useTranslations('admin')
    const tc = useTranslations('common.role')
    const roleOptions = [
        { value: 'athlete', label: tc('athlete') },
        { value: 'coach', label: tc('coach') },
    ]
    const statusOptions = [
        { value: 'active', label: t('statusActive') },
        { value: 'disabled', label: t('statusDisabled') },
        { value: 'deleted', label: t('statusDeleted') },
    ]
    const whoOf = (u: AdminUser) => (u.username ? `@${u.username}` : u.email)
    const errorMessage = useErrorMessage()
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
            setError(errorMessage(err))
        }
    }

    async function confirmAdmin() {
        if (!adminTarget) return
        setError(null)
        try {
            await setAdmin.mutateAsync({ userId: adminTarget.user.id, isAdmin: adminTarget.next })
            setAdminTarget(null)
        } catch (err) {
            setError(errorMessage(err))
        }
    }

    async function confirmStatus() {
        if (!statusTarget) return
        setError(null)
        try {
            await setStatus.mutateAsync({ userId: statusTarget.user.id, disabled: statusTarget.disable })
            setStatusTarget(null)
        } catch (err) {
            setError(errorMessage(err))
        }
    }

    return (
        <div>
            <TextsReveal>
                <p className="font-mono text-eyebrow uppercase text-text-faint">{t('eyebrow')}</p>
                <h1 className="mt-1 font-display text-h2 tracking-tight">{t('usersTitle')}</h1>
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
                    placeholder={t('searchEmail')}
                    className="w-64"
                />
                <MultiSelect
                    analyticsId="admin-users-filter-role"
                    label={t('filterRole')}
                    options={roleOptions}
                    selected={roles}
                    onChange={setRoles}
                />
                <MultiSelect
                    analyticsId="admin-users-filter-status"
                    label={t('filterStatus')}
                    options={statusOptions}
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
                    {t('adminsOnly')}
                </TrackedButton>
            </div>

            <FormError error={error} className="mt-4" />

            {/* Table on md+, stacked cards on phones. */}
            <div className="mt-6 overflow-hidden rounded-2xl ring-1 ring-hairline">
                {/* Phone: one card per user. */}
                <div className="md:hidden">
                    {isLoading ? (
                        <div className="space-y-2 p-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <Skeleton key={i} className="h-24" />
                            ))}
                        </div>
                    ) : rows.length === 0 ? (
                        <p className="px-5 py-8 text-sm text-text-dim">{t('noUsersMatch')}</p>
                    ) : (
                        <div className="divide-y divide-hairline">
                            {rows.map((user) => {
                                const isSelf = user.id === me?.id
                                return (
                                    <div key={user.id} className="p-4">
                                        <UserIdentity user={user} />
                                        <div className="mt-4 grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="font-mono text-eyebrow uppercase text-text-faint">
                                                    {t('colRole')}
                                                </p>
                                                <div className="mt-1.5">
                                                    <RoleControl
                                                        user={user}
                                                        onChange={(role) => changeRole(user, role)}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="font-mono text-eyebrow uppercase text-text-faint">
                                                    {t('colPlan')}
                                                </p>
                                                <div className="mt-1.5">
                                                    <PlanBadge plan={user.plan} />
                                                </div>
                                            </div>
                                            <div>
                                                <p className="font-mono text-eyebrow uppercase text-text-faint">
                                                    {t('colStatus')}
                                                </p>
                                                <div className="mt-1.5">
                                                    <StatusControl
                                                        user={user}
                                                        isSelf={isSelf}
                                                        onToggle={() =>
                                                            setStatusTarget({
                                                                user,
                                                                disable: user.status === 'active',
                                                            })
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <p className="font-mono text-eyebrow uppercase text-text-faint">
                                                    {t('colAdmin')}
                                                </p>
                                                <div className="mt-1.5">
                                                    <AdminControl
                                                        user={user}
                                                        isSelf={isSelf}
                                                        onToggle={() => setAdminTarget({ user, next: !user.isAdmin })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}

                            {isFetchingNextPage ? (
                                <div className="space-y-2 p-3">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <Skeleton key={i} className="h-24" />
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>

                {/* md and up: a real table keeps header/body columns + vertical padding aligned. */}
                <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[44rem] table-fixed border-collapse text-sm">
                        <thead>
                            <tr className="bg-white/[0.02] text-left font-mono text-eyebrow uppercase text-text-faint">
                                <th className="px-5 py-3 font-normal">{t('colUser')}</th>
                                <th className="w-40 px-5 py-3 font-normal">{t('colRole')}</th>
                                <th className="w-36 px-5 py-3 font-normal">{t('colPlan')}</th>
                                <th className="w-36 px-5 py-3 font-normal">{t('colStatus')}</th>
                                <th className="w-44 px-5 py-3 text-right font-normal">{t('colAdmin')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-3">
                                        <div className="space-y-2">
                                            {Array.from({ length: 6 }).map((_, i) => (
                                                <Skeleton key={i} className="h-12" />
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-5 py-8 text-text-dim">
                                        {t('noUsersMatch')}
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {rows.map((user) => {
                                        const isSelf = user.id === me?.id
                                        return (
                                            <tr key={user.id} className="border-t border-hairline">
                                                <td className="px-5 py-3">
                                                    <UserIdentity user={user} />
                                                </td>
                                                <td className="px-5 py-3">
                                                    <RoleControl
                                                        user={user}
                                                        onChange={(role) => changeRole(user, role)}
                                                    />
                                                </td>
                                                <td className="px-5 py-3">
                                                    <PlanBadge plan={user.plan} />
                                                </td>
                                                <td className="px-5 py-3">
                                                    <StatusControl
                                                        user={user}
                                                        isSelf={isSelf}
                                                        onToggle={() =>
                                                            setStatusTarget({
                                                                user,
                                                                disable: user.status === 'active',
                                                            })
                                                        }
                                                    />
                                                </td>
                                                <td className="px-5 py-3 text-right">
                                                    <AdminControl
                                                        user={user}
                                                        isSelf={isSelf}
                                                        onToggle={() => setAdminTarget({ user, next: !user.isAdmin })}
                                                    />
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
            </div>

            {/* Infinite-scroll trigger. */}
            <div ref={sentinelRef} aria-hidden />

            {!isLoading && rows.length > 0 ? (
                <p className="mt-3 text-right font-mono text-xs text-text-faint">
                    {t('countOf', { shown: rows.length, total })}
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
                title={adminTarget?.next ? t('grantTitle') : t('revokeTitle')}
                description={
                    adminTarget
                        ? adminTarget.next
                            ? t('grantBody', { who: whoOf(adminTarget.user) })
                            : t('revokeBody', { who: whoOf(adminTarget.user) })
                        : undefined
                }
                confirmLabel={adminTarget?.next ? t('grant') : t('revoke')}
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
                title={statusTarget?.disable ? t('disableTitle') : t('enableTitle')}
                description={
                    statusTarget
                        ? statusTarget.disable
                            ? t('disableBody', { who: whoOf(statusTarget.user) })
                            : t('enableBody', { who: whoOf(statusTarget.user) })
                        : undefined
                }
                confirmLabel={statusTarget?.disable ? t('disable') : t('enable')}
                destructive={statusTarget?.disable}
                pending={setStatus.isPending}
                error={error}
            />
        </div>
    )
}
