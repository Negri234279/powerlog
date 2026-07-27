'use client'

import { useTranslations } from 'next-intl'
import { usePathname, useRouter } from 'next/navigation'
import { type ReactNode, useEffect, useState } from 'react'

import type { Session } from '@/lib/auth/session'
import { identifyUser, resetAnalytics, track } from '@/lib/analytics/events'
import { cn } from '@/lib/cn'
import { hardLogout } from '@/lib/graphql/client'
import { ArrowUpRight, Close, Mark, Menu } from '@/components/ui/icons'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'
import { NotificationBell } from '@/components/app/notification-bell'
import { UnreadBadge } from '@/components/chat/unread-badge'
import { ChatSocketProvider } from '@/lib/chat/chat-socket'
import { useChatConversations } from '@/lib/graphql/hooks/use-chat'
import { useLogout, useMe } from '@/lib/graphql/hooks/use-auth'
import { useRealtime } from '@/lib/realtime/use-realtime'

const NAV = [
    { id: 'dashboard', href: '/dashboard' },
    { id: 'workouts', href: '/workouts' },
    { id: 'coaching', href: '/coaching' },
    { id: 'chat', href: '/chat' },
] as const

/** Authenticated chrome: top bar with nav + user + logout. The authed layout
 *  gates the route server-side and seeds `initialUser` from the verified access
 *  token, so the handle/avatar paint immediately; `useMe` fills the full profile
 *  and this still bounces to /login if the session turns out to be invalid. */
export function AppShell({
    children,
    initialUser,
    footer,
}: {
    children: React.ReactNode
    initialUser?: Session | null
    /** The marketing footer, passed in as a slot (it's a server component; this
     *  shell is a client component). Rendered with `mt-auto` so it stays at the
     *  bottom on short pages. */
    footer?: ReactNode
}) {
    const t = useTranslations('shell')
    const { data: me, isError } = useMe()
    const logout = useLogout()
    const router = useRouter()
    const pathname = usePathname()
    const [menuOpen, setMenuOpen] = useState(false)

    // One live-update stream for the whole authed app: what the coach (or athlete)
    // is looking at refreshes itself when the other side acts.
    useRealtime()

    // Total unread across every conversation → the badge on the Chat nav item.
    const chatUnread = (useChatConversations().data ?? []).reduce((sum, c) => sum + c.unreadCount, 0)

    // Prefer the live profile once loaded; fall back to the token's username so
    // the chrome never flashes empty on first paint.
    const username = me?.username ?? initialUser?.username
    // Avatar rides in the access token (resolved from the profile); null → initials.
    const avatar = initialUser?.avatar ?? null
    const onProfile = isActive('/profile')
    // Admins get an extra nav entry; the route itself is gated server-side too.
    const nav = initialUser?.isAdmin ? [...NAV, { id: 'admin', href: '/admin' } as const] : NAV

    // A dead session (useMe errored after a failed refresh) can't be cleared with
    // a client navigation — the HTTPOnly refresh cookie would linger and bounce
    // /login back here. hardLogout hands off to the server route that drops the
    // cookies, so we escape the trap instead of stalling on a half-rendered page.
    useEffect(() => {
        if (isError) hardLogout()
    }, [isError])

    // Tie analytics events + replays to the user once their identity is known
    // (covers login, register and page reloads). username is a public handle.
    useEffect(() => {
        if (me) identifyUser(me.id, me.username)
    }, [me])

    // Close the mobile menu on navigation.
    useEffect(() => {
        setMenuOpen(false)
    }, [pathname])

    // While the overlay is open: lock background scroll and close on Escape.
    useEffect(() => {
        if (!menuOpen) return
        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setMenuOpen(false)
        }
        window.addEventListener('keydown', onKey)
        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', onKey)
        }
    }, [menuOpen])

    async function onLogout() {
        setMenuOpen(false)
        track('user_logged_out', {})
        try {
            await logout.mutateAsync()
        } catch {
            /* clear cookies best-effort; navigate regardless */
        }
        // Forget the identity so the next visitor on this device starts anonymous.
        resetAnalytics()
        router.replace('/login')
    }

    function isActive(href: string): boolean {
        return pathname === href || pathname.startsWith(`${href}/`)
    }

    return (
        <ChatSocketProvider>
            <div className="flex min-h-[100dvh] flex-col">
                <header className="sticky top-0 z-50 border-b border-hairline bg-bg/80 backdrop-blur-xl">
                    <div className="mx-auto flex max-w-[72rem] items-center justify-between gap-6 px-6 py-3">
                        <div className="flex items-center gap-8">
                            <TrackedLink
                                analyticsId="shell-logo"
                                href="/dashboard"
                                className="flex items-center gap-2.5"
                            >
                                <span className="grid size-8 place-items-center rounded-xl bg-ember-gradient text-bg">
                                    <Mark className="size-4.5" />
                                </span>
                                <span className="font-display text-base font-semibold tracking-tight">powerlog</span>
                            </TrackedLink>
                            <nav className="hidden items-center gap-1 sm:flex">
                                {nav.map((n) => (
                                    <TrackedLink
                                        analyticsId={`shell-nav-${n.id}`}
                                        key={n.href}
                                        href={n.href}
                                        aria-current={isActive(n.href) ? 'page' : undefined}
                                        className={cn(
                                            'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors duration-300',
                                            isActive(n.href)
                                                ? 'bg-white/[0.06] text-text'
                                                : 'text-text-dim hover:text-text',
                                        )}
                                    >
                                        {t(`nav.${n.id}`)}
                                        {n.id === 'chat' ? <UnreadBadge count={chatUnread} /> : null}
                                    </TrackedLink>
                                ))}
                            </nav>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3">
                            <NotificationBell />

                            {/* User cluster → profile. Handle on desktop; avatar always. */}
                            <TrackedLink
                                analyticsId="shell-profile"
                                href="/profile"
                                aria-label={t('profileAria')}
                                className="group flex items-center gap-2.5 rounded-full transition-opacity duration-300 hover:opacity-90"
                            >
                                {username ? (
                                    <span className="hidden font-mono text-sm text-text-dim transition-colors duration-300 group-hover:text-text sm:inline">
                                        @{username}
                                    </span>
                                ) : null}
                                <span
                                    className={cn(
                                        'grid size-9 place-items-center overflow-hidden rounded-full bg-white/[0.06] font-mono text-sm uppercase text-text ring-1 transition-colors duration-300',
                                        onProfile ? 'ring-text/40' : 'ring-hairline',
                                    )}
                                >
                                    {avatar ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={avatar} alt="" className="size-full object-cover" />
                                    ) : username ? (
                                        username.slice(0, 2)
                                    ) : (
                                        '··'
                                    )}
                                </span>
                            </TrackedLink>

                            <TrackedButton
                                analyticsId="shell-logout"
                                type="button"
                                onClick={onLogout}
                                className="hidden rounded-full px-3.5 py-1.5 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text active:scale-[0.98] sm:inline-block"
                            >
                                {t('logout')}
                            </TrackedButton>

                            {/* Burger — morphs to an X. Mobile only. */}
                            <TrackedButton
                                analyticsId="shell-menu-toggle"
                                type="button"
                                onClick={() => setMenuOpen((open) => !open)}
                                aria-label={menuOpen ? t('menuClose') : t('menuOpen')}
                                aria-expanded={menuOpen}
                                aria-controls="mobile-menu"
                                className="grid size-9 place-items-center rounded-full text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:text-text active:scale-[0.98] sm:hidden"
                            >
                                <span className="relative block size-5">
                                    <Menu
                                        className={cn(
                                            'absolute inset-0 size-5 transition-all duration-300',
                                            menuOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100',
                                        )}
                                    />
                                    <Close
                                        className={cn(
                                            'absolute inset-0 size-5 transition-all duration-300',
                                            menuOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0',
                                        )}
                                    />
                                </span>
                            </TrackedButton>
                        </div>
                    </div>
                </header>

                {/* Full-screen glass overlay — sits above content (doesn't reflow it). */}
                {menuOpen ? (
                    <div
                        id="mobile-menu"
                        className="animate-overlay-in fixed inset-0 z-40 bg-bg/85 backdrop-blur-2xl sm:hidden"
                    >
                        <div className="flex h-[100dvh] flex-col px-6 pb-10 pt-24">
                            <p className="font-mono text-eyebrow uppercase text-text-faint">{t('navigate')}</p>

                            <nav className="mt-6 flex flex-col gap-1">
                                {nav.map((n, i) => (
                                    <TrackedLink
                                        analyticsId={`shell-nav-mobile-${n.id}`}
                                        key={n.href}
                                        href={n.href}
                                        aria-current={isActive(n.href) ? 'page' : undefined}
                                        style={{ animationDelay: `${80 + i * 60}ms` }}
                                        className={cn(
                                            'animate-menu-item group flex items-center justify-between rounded-2xl px-4 py-4 font-display text-2xl tracking-tight transition-colors duration-300',
                                            isActive(n.href)
                                                ? 'text-text'
                                                : 'text-text-dim hover:bg-white/[0.04] hover:text-text',
                                        )}
                                    >
                                        <span className="flex items-center gap-2">
                                            {t(`nav.${n.id}`)}
                                            {n.id === 'chat' ? <UnreadBadge count={chatUnread} /> : null}
                                        </span>
                                        {isActive(n.href) ? (
                                            <span className="size-1.5 rounded-full bg-ember shadow-[0_0_12px_rgba(255,106,44,0.7)]" />
                                        ) : (
                                            <ArrowUpRight className="size-5 text-text-faint transition-transform duration-300 group-hover:-translate-y-px group-hover:translate-x-0.5 group-hover:text-text" />
                                        )}
                                    </TrackedLink>
                                ))}
                            </nav>

                            <div
                                className="animate-menu-item mt-auto"
                                style={{ animationDelay: `${80 + nav.length * 60}ms` }}
                            >
                                {username ? (
                                    <p className="mb-3 px-4 font-mono text-sm text-text-dim">
                                        {t('signedInAs', { user: `@${username}` })}
                                    </p>
                                ) : null}
                                <TrackedButton
                                    analyticsId="shell-logout-mobile"
                                    type="button"
                                    onClick={onLogout}
                                    className="w-full rounded-full px-5 py-3 text-sm text-text-dim ring-1 ring-hairline transition-colors duration-300 hover:bg-white/[0.04] hover:text-text active:scale-[0.98]"
                                >
                                    {t('logout')}
                                </TrackedButton>
                            </div>
                        </div>
                    </div>
                ) : null}

                <main className="mx-auto w-full max-w-[72rem] px-6 py-10 md:py-14">{children}</main>

                {footer}
            </div>
        </ChatSocketProvider>
    )
}
