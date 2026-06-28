import { Reveal } from '@/components/ui/reveal'

const STATS = [
    { value: '2.4M', label: 'Sets logged' },
    { value: '180K', label: 'PRs detected' },
    { value: '11', label: 'Lift categories' },
    { value: 'kg / lb', label: 'Your units, always' },
]

const TERMS = [
    'Squat',
    'Bench',
    'Deadlift',
    'Overhead Press',
    'Row',
    'RPE',
    'RIR',
    'e1RM',
    'Block Periodization',
    'Volume',
    'Top Sets',
    'Back-off',
]

export function Proof() {
    return (
        <section className="relative px-6 py-20 md:px-8">
            <div className="mx-auto max-w-[80rem]">
                <Reveal>
                    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[2rem] bg-hairline ring-1 ring-hairline md:grid-cols-4">
                        {STATS.map((s) => (
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
                    {[...TERMS, ...TERMS].map((t, i) => (
                        <span key={i} className="font-mono text-sm uppercase tracking-[0.18em] text-text-faint">
                            {t}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    )
}
