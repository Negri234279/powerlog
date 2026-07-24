import { getTranslations } from 'next-intl/server'

import { Reveal } from '@/components/ui/reveal'

export async function Proof() {
    const t = await getTranslations('landing.proof')

    // Demo figures stay hard-coded; only the labels are translated.
    const stats = [
        { value: '2.4M', label: t('setsLogged') },
        { value: '180K', label: t('prsDetected') },
        { value: '11', label: t('categories') },
        { value: 'kg / lb', label: t('units') },
    ]
    const terms = t.raw('terms') as string[]

    return (
        <section className="relative px-6 py-20 md:px-8">
            <div className="mx-auto max-w-[80rem]">
                <Reveal>
                    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[2rem] bg-hairline ring-1 ring-hairline md:grid-cols-4">
                        {stats.map((s) => (
                            <div key={s.label} className="bg-bg px-6 py-8 text-center">
                                <p className="font-display text-4xl font-semibold tracking-tight tabular-nums md:text-5xl">
                                    {s.value}
                                </p>
                                <p className="mt-2 font-mono text-eyebrow uppercase text-text-faint">{s.label}</p>
                            </div>
                        ))}
                    </div>
                </Reveal>
            </div>

            {/* disciplines marquee */}
            <div className="relative mt-16 flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
                <div className="flex shrink-0 animate-marquee items-center gap-10 pr-10">
                    {[...terms, ...terms].map((term, i) => (
                        <span key={i} className="font-mono text-sm uppercase tracking-[0.18em] text-text-faint">
                            {term}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    )
}
