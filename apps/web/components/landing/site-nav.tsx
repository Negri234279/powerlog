'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/cn'
import { PrimaryCta } from '@/components/ui/cta'
import { Mark } from '@/components/ui/icons'
import { TrackedButton, TrackedLink } from '@/components/ui/tracked'

const LINKS = [
    { id: 'features', href: '#features' },
    { id: 'analytics', href: '#analytics' },
    { id: 'coaching', href: '#coaching' },
    { id: 'pricing', href: '#pricing' },
] as const

function Wordmark() {
    return (
        <TrackedLink analyticsId="nav-wordmark" href="#top" className="flex shrink-0 items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-ember-gradient text-bg">
                <Mark className="size-4.5" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">powerlog</span>
        </TrackedLink>
    )
}

export function SiteNav() {
    const t = useTranslations('landing.nav')
    const [open, setOpen] = useState(false)

    // Lock body scroll while the full-screen menu is open.
    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : ''
        return () => {
            document.body.style.overflow = ''
        }
    }, [open])

    return (
        <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4">
            {/* The pill hugs its content on desktop (min/max clamped) so it fits longer
                localized labels — English sits compact, Spanish grows — and never wraps.
                Below lg it's a full-width bar with the hamburger. */}
            <nav className="mt-5 flex w-full max-w-3xl items-center justify-between gap-6 rounded-full bg-white/[0.04] py-2 pr-2 pl-5 ring-1 ring-hairline backdrop-blur-xl lg:w-auto lg:min-w-[42rem] lg:max-w-[62rem] lg:gap-8">
                <Wordmark />

                <div className="hidden items-center gap-6 lg:flex">
                    {LINKS.map((l) => (
                        <TrackedLink
                            analyticsId={`nav-${l.id}`}
                            key={l.href}
                            href={l.href}
                            className="whitespace-nowrap text-sm text-text-dim transition-colors duration-300 hover:text-text"
                        >
                            {t(l.id)}
                        </TrackedLink>
                    ))}
                </div>

                <div className="hidden shrink-0 items-center gap-2 lg:flex">
                    <TrackedLink
                        analyticsId="nav-login"
                        href="/login"
                        className="whitespace-nowrap rounded-full px-4 py-2 text-sm text-text-dim transition-colors hover:text-text"
                    >
                        {t('login')}
                    </TrackedLink>
                    <PrimaryCta href="/register" analyticsId="nav-register" className="shrink-0 whitespace-nowrap">
                        {t('startFree')}
                    </PrimaryCta>
                </div>

                {/* Mobile hamburger → morphs to X */}
                <TrackedButton
                    analyticsId="nav-menu-toggle"
                    type="button"
                    aria-label={open ? t('closeMenu') : t('openMenu')}
                    aria-expanded={open}
                    onClick={() => setOpen((v) => !v)}
                    className="relative grid size-10 place-items-center rounded-full ring-1 ring-hairline lg:hidden"
                >
                    <span
                        className={cn(
                            'absolute h-px w-4 bg-text transition-all duration-500 ease-spring',
                            open ? 'rotate-45' : '-translate-y-1',
                        )}
                    />
                    <span
                        className={cn(
                            'absolute h-px w-4 bg-text transition-all duration-500 ease-spring',
                            open ? '-rotate-45' : 'translate-y-1',
                        )}
                    />
                </TrackedButton>
            </nav>

            {/* Full-screen glass overlay (mobile) */}
            <div
                className={cn(
                    'fixed inset-0 z-40 flex flex-col bg-bg/80 backdrop-blur-3xl transition-opacity duration-500 ease-spring lg:hidden',
                    open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
                )}
            >
                <div className="flex flex-col gap-2 px-8 pt-32">
                    {LINKS.map((l, i) => (
                        <TrackedLink
                            analyticsId={`nav-mobile-${l.id}`}
                            key={l.href}
                            href={l.href}
                            onClick={() => setOpen(false)}
                            style={{ transitionDelay: open ? `${100 + i * 60}ms` : '0ms' }}
                            className={cn(
                                'font-display text-4xl font-semibold tracking-tight transition-all duration-500 ease-spring',
                                open ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0',
                            )}
                        >
                            {t(l.id)}
                        </TrackedLink>
                    ))}
                    <div className="mt-10 flex flex-col gap-3">
                        <PrimaryCta href="/register" className="justify-between" analyticsId="nav-mobile-register">
                            {t('startFree')}
                        </PrimaryCta>
                        <TrackedLink
                            analyticsId="nav-mobile-login"
                            href="/login"
                            onClick={() => setOpen(false)}
                            className="rounded-full px-6 py-3 text-center text-sm text-text-dim ring-1 ring-hairline"
                        >
                            {t('login')}
                        </TrackedLink>
                    </div>
                </div>
            </div>
        </header>
    )
}
