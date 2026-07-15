import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'

import { Eyebrow } from '@/components/ui/eyebrow'
import { Reveal } from '@/components/ui/reveal'

function RoleCard({
    tag,
    title,
    children,
    lines,
}: {
    tag: string
    title: string
    children: ReactNode
    lines: string[]
}) {
    return (
        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-7 md:p-8">
                <span className="font-mono text-eyebrow uppercase text-text-faint">{tag}</span>
                <h3 className="mt-3 font-display text-h2">{title}</h3>
                <p className="mt-3 text-body text-text-dim">{children}</p>
                <div className="mt-6 space-y-2">
                    {lines.map((l) => (
                        <div
                            key={l}
                            className="flex items-center gap-3 rounded-xl bg-bg/60 px-4 py-3 font-mono text-sm text-text-dim ring-1 ring-hairline"
                        >
                            <span className="size-1.5 rounded-full bg-ember-gradient" />
                            {l}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export async function Coaching() {
    const t = await getTranslations('landing.coaching')

    return (
        <section id="coaching" className="relative px-6 py-28 md:px-8 md:py-40">
            <div className="mx-auto max-w-[80rem]">
                <Reveal className="max-w-2xl">
                    <Eyebrow>{t('eyebrow')}</Eyebrow>
                    <h2 className="mt-6 font-display text-display">{t('title')}</h2>
                    <p className="mt-5 text-body-lg text-text-dim">{t('body')}</p>
                </Reveal>

                <div className="relative mt-14 grid gap-4 md:grid-cols-2 md:gap-6">
                    <Reveal delay={0}>
                        <RoleCard
                            tag={t('coach.tag')}
                            title={t('coach.title')}
                            lines={t.raw('coach.lines') as string[]}
                        >
                            {t('coach.body')}
                        </RoleCard>
                    </Reveal>

                    {/* connecting ember node */}
                    <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 md:block">
                        <span className="grid size-11 place-items-center rounded-full bg-ember-gradient text-bg glow-ember">
                            <svg
                                viewBox="0 0 24 24"
                                className="size-5"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={1.4}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                            >
                                <path d="M5 12h14M13 6l6 6-6 6" />
                            </svg>
                        </span>
                    </div>

                    <Reveal delay={120}>
                        <RoleCard
                            tag={t('athlete.tag')}
                            title={t('athlete.title')}
                            lines={t.raw('athlete.lines') as string[]}
                        >
                            {t('athlete.body')}
                        </RoleCard>
                    </Reveal>
                </div>
            </div>
        </section>
    )
}
