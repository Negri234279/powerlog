'use client'

import { useEffect, useState } from 'react'

import { cn } from '@/lib/cn'
import { PrimaryCta } from '@/components/ui/cta'
import { Mark } from '@/components/ui/icons'

const LINKS = [
    { label: 'Features', href: '#features' },
    { label: 'Analytics', href: '#analytics' },
    { label: 'Coaching', href: '#coaching' },
    { label: 'Pricing', href: '#pricing' },
]

function Wordmark() {
    return (
        <a href="#top" className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-ember-gradient text-bg">
                <Mark className="size-4.5" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">powerlog</span>
        </a>
    )
}

export function SiteNav() {
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
            <nav className="mt-5 flex w-full max-w-3xl items-center justify-between gap-6 rounded-full bg-white/[0.04] py-2 pr-2 pl-5 ring-1 ring-hairline backdrop-blur-xl">
                <Wordmark />

                <div className="hidden items-center gap-7 md:flex">
                    {LINKS.map((l) => (
                        <a
                            key={l.href}
                            href={l.href}
                            className="text-sm text-text-dim transition-colors duration-300 hover:text-text"
                        >
                            {l.label}
                        </a>
                    ))}
                </div>

                <div className="hidden items-center gap-2 md:flex">
                    <a
                        href="/login"
                        className="rounded-full px-4 py-2 text-sm text-text-dim transition-colors hover:text-text"
                    >
                        Log in
                    </a>
                    <PrimaryCta href="/register" analyticsId="nav-register">
                        Start free
                    </PrimaryCta>
                </div>

                {/* Mobile hamburger → morphs to X */}
                <button
                    type="button"
                    aria-label={open ? 'Close menu' : 'Open menu'}
                    aria-expanded={open}
                    onClick={() => setOpen((v) => !v)}
                    className="relative grid size-10 place-items-center rounded-full ring-1 ring-hairline md:hidden"
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
                </button>
            </nav>

            {/* Full-screen glass overlay (mobile) */}
            <div
                className={cn(
                    'fixed inset-0 z-40 flex flex-col bg-bg/80 backdrop-blur-3xl transition-opacity duration-500 ease-spring md:hidden',
                    open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
                )}
            >
                <div className="flex flex-col gap-2 px-8 pt-32">
                    {LINKS.map((l, i) => (
                        <a
                            key={l.href}
                            href={l.href}
                            onClick={() => setOpen(false)}
                            style={{ transitionDelay: open ? `${100 + i * 60}ms` : '0ms' }}
                            className={cn(
                                'font-display text-4xl font-semibold tracking-tight transition-all duration-500 ease-spring',
                                open ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0',
                            )}
                        >
                            {l.label}
                        </a>
                    ))}
                    <div className="mt-10 flex flex-col gap-3">
                        <PrimaryCta href="/register" className="justify-between" analyticsId="nav-mobile-register">
                            Start free
                        </PrimaryCta>
                        <a
                            href="/login"
                            onClick={() => setOpen(false)}
                            className="rounded-full px-6 py-3 text-center text-sm text-text-dim ring-1 ring-hairline"
                        >
                            Log in
                        </a>
                    </div>
                </div>
            </div>
        </header>
    )
}
