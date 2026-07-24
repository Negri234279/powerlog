import { getTranslations } from 'next-intl/server'

import { PrimaryCta, SecondaryCta } from '@/components/ui/cta'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Reveal } from '@/components/ui/reveal'

/** A logged set row in the hero's faux session panel. */
function SetRow({
    n,
    load,
    reps,
    rpe,
    e1rm,
    pr,
}: {
    n: number
    load: string
    reps: number
    rpe: string
    e1rm: string
    pr?: boolean
}) {
    return (
        <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 font-mono text-sm tabular-nums even:bg-white/[0.02]">
            <span className="w-4 text-text-faint">{n}</span>
            <span className="flex-1 text-text">
                {load}
                <span className="text-text-faint"> × {reps}</span>
            </span>
            <span className="w-12 text-right text-text-dim">@{rpe}</span>
            <span className={pr ? 'w-20 text-right text-pr' : 'w-20 text-right text-text-dim'}>
                {e1rm}
                {pr ? ' ★' : ''}
            </span>
        </div>
    )
}

async function SessionPanel() {
    const t = await getTranslations('landing.hero.panel')

    return (
        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-5">
                {/* panel header */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-display text-lg font-semibold tracking-tight">{t('lift')}</p>
                        <p className="font-mono text-eyebrow uppercase text-text-faint">{t('week')}</p>
                    </div>
                    <span className="rounded-full bg-pr/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-pr">
                        {t('completed')}
                    </span>
                </div>

                {/* sets */}
                <div className="mt-4">
                    <SetRow n={1} load="140kg" reps={3} rpe="7" e1rm="154.0" />
                    <SetRow n={2} load="170kg" reps={1} rpe="8" e1rm="178.5" />
                    <SetRow n={3} load="190kg" reps={1} rpe="9" e1rm="196.3" />
                    <SetRow n={4} load="200kg" reps={1} rpe="9.5" e1rm="207.5" pr />
                </div>

                {/* e1RM trend sparkline */}
                <div className="mt-5 rounded-2xl bg-bg/60 p-4 ring-1 ring-hairline">
                    <div className="flex items-center justify-between">
                        <span className="font-mono text-eyebrow uppercase text-text-faint">{t('est1rm')}</span>
                        <span className="font-mono text-sm tabular-nums text-ember">+18.2kg</span>
                    </div>
                    <svg viewBox="0 0 300 70" className="mt-3 h-16 w-full" fill="none" aria-hidden>
                        <defs>
                            <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#ff6a2c" stopOpacity="0.35" />
                                <stop offset="100%" stopColor="#ff6a2c" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <path
                            d="M0 58 L40 54 L80 48 L120 50 L160 38 L200 30 L240 22 L300 10"
                            stroke="#ff6a2c"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M0 58 L40 54 L80 48 L120 50 L160 38 L200 30 L240 22 L300 10 L300 70 L0 70 Z"
                            fill="url(#spark)"
                        />
                    </svg>
                </div>
            </div>
        </div>
    )
}

export async function Hero() {
    const t = await getTranslations('landing.hero')

    return (
        <section id="top" className="relative overflow-hidden px-6 pt-40 pb-24 md:px-8 md:pt-48 md:pb-32">
            {/* mesh orbs */}
            <div className="orb left-[-10%] top-[-5%] size-[520px] bg-ember" />
            <div className="orb right-[-8%] top-[20%] size-[420px] bg-amber" />

            <div className="mx-auto grid max-w-[80rem] items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
                {/* Left — type */}
                <div className="max-w-2xl">
                    <Reveal>
                        <Eyebrow>{t('eyebrow')}</Eyebrow>
                    </Reveal>
                    <Reveal delay={80}>
                        <h1 className="mt-6 font-display text-display-xl">
                            {t.rich('title', {
                                em: (chunks) => <span className="text-gradient-ember">{chunks}</span>,
                            })}
                        </h1>
                    </Reveal>
                    <Reveal delay={160}>
                        <p className="mt-6 max-w-xl text-body-lg text-text-dim">{t('subtitle')}</p>
                    </Reveal>
                    <Reveal delay={240}>
                        <div className="mt-9 flex flex-wrap items-center gap-3">
                            <PrimaryCta href="/register" analyticsId="hero-register">
                                {t('ctaPrimary')}
                            </PrimaryCta>
                            <SecondaryCta href="#analytics" analyticsId="hero-see-data">
                                {t('ctaSecondary')}
                            </SecondaryCta>
                        </div>
                    </Reveal>
                    <Reveal delay={320}>
                        <p className="mt-8 font-mono text-eyebrow uppercase text-text-faint">{t('noCard')}</p>
                    </Reveal>
                </div>

                {/* Right — Z-axis cascade */}
                <Reveal delay={200} className="relative">
                    <SessionPanel />
                    {/* floating stat chips */}
                    <div className="absolute -left-6 top-10 hidden rotate-[-3deg] rounded-2xl bg-shell p-1.5 ring-1 ring-hairline sm:block">
                        <div className="inset-hi rounded-[calc(1rem-0.25rem)] bg-surface px-4 py-3">
                            <p className="font-mono text-eyebrow uppercase text-text-faint">{t('panel.newPr')}</p>
                            <p className="font-mono text-xl tabular-nums text-text">207.5kg</p>
                        </div>
                    </div>
                    <div className="absolute -right-5 -bottom-6 hidden rotate-[3deg] rounded-2xl bg-shell p-1.5 ring-1 ring-hairline sm:block">
                        <div className="inset-hi rounded-[calc(1rem-0.25rem)] bg-surface px-4 py-3">
                            <p className="font-mono text-eyebrow uppercase text-text-faint">{t('panel.streak')}</p>
                            <p className="font-mono text-xl tabular-nums text-pr">{t('panel.streakValue')}</p>
                        </div>
                    </div>
                </Reveal>
            </div>
        </section>
    )
}
