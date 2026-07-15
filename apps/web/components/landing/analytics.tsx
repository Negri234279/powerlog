import { getTranslations } from 'next-intl/server'

import { Eyebrow } from '@/components/ui/eyebrow'
import { Reveal } from '@/components/ui/reveal'

const WEEKS = [38, 46, 41, 52, 49, 58, 54, 63, 60, 68, 64, 74]

function VolumeChart({
    volumeLabel,
    badge,
    wkFirst,
    wkLast,
}: {
    volumeLabel: string
    badge: string
    wkFirst: string
    wkLast: string
}) {
    const max = Math.max(...WEEKS)
    return (
        <div className="rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline">
            <div className="inset-hi rounded-[calc(2rem-0.375rem)] bg-surface p-6 md:p-8">
                <div className="flex items-end justify-between">
                    <div>
                        <p className="font-mono text-eyebrow uppercase text-text-faint">{volumeLabel}</p>
                        <p className="mt-1 font-display text-3xl font-semibold tabular-nums">74.0t</p>
                    </div>
                    <span className="rounded-full bg-pr/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-pr">
                        {badge}
                    </span>
                </div>

                <div className="mt-8 flex h-44 items-end gap-1.5 md:gap-2.5">
                    {WEEKS.map((v, i) => (
                        <div
                            key={i}
                            className={
                                i === WEEKS.length - 1
                                    ? 'flex-1 rounded-t-md bg-ember-gradient'
                                    : 'flex-1 rounded-t-md bg-white/[0.08]'
                            }
                            style={{ height: `${(v / max) * 100}%` }}
                        />
                    ))}
                </div>
                <div className="mt-3 flex justify-between font-mono text-[10px] uppercase tracking-widest text-text-faint">
                    <span>{wkFirst}</span>
                    <span>{wkLast}</span>
                </div>
            </div>
        </div>
    )
}

export async function Analytics() {
    const t = await getTranslations('landing.analytics')
    const bullets = t.raw('bullets') as string[]

    return (
        <section id="analytics" className="relative overflow-hidden bg-bg-elev px-6 py-28 md:px-8 md:py-40">
            <div className="orb left-1/2 top-1/3 size-[440px] -translate-x-1/2 bg-ember" />
            <div className="mx-auto grid max-w-[80rem] items-center gap-14 lg:grid-cols-2">
                <Reveal>
                    <Eyebrow>{t('eyebrow')}</Eyebrow>
                    <h2 className="mt-6 font-display text-display">{t('title')}</h2>
                    <p className="mt-5 max-w-lg text-body-lg text-text-dim">{t('body')}</p>
                    <ul className="mt-8 space-y-3 text-body text-text-dim">
                        {bullets.map((bullet) => (
                            <li key={bullet} className="flex items-center gap-3">
                                <span className="size-1.5 rounded-full bg-ember-gradient" />
                                {bullet}
                            </li>
                        ))}
                    </ul>
                </Reveal>

                <Reveal delay={120}>
                    <VolumeChart
                        volumeLabel={t('weeklyVolume')}
                        badge={t('badge')}
                        wkFirst={t('wkFirst')}
                        wkLast={t('wkLast')}
                    />
                </Reveal>
            </div>
        </section>
    )
}
