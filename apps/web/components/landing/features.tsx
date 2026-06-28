import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { Bolt, Calendar, ChartLine, Scale, Target, Users } from '@/components/ui/icons'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Reveal } from '@/components/ui/reveal'

function Card({
    className,
    icon,
    title,
    children,
    visual,
}: {
    className?: string
    icon: ReactNode
    title: string
    children: ReactNode
    visual?: ReactNode
}) {
    return (
        <div className={cn('rounded-[2rem] bg-shell p-1.5 ring-1 ring-hairline', className)}>
            <div className="inset-hi flex h-full flex-col rounded-[calc(2rem-0.375rem)] bg-surface p-6 md:p-7">
                <span className="grid size-10 place-items-center rounded-xl bg-white/[0.04] text-ember ring-1 ring-hairline">
                    {icon}
                </span>
                <h3 className="mt-5 font-display text-h3">{title}</h3>
                <p className="mt-2.5 text-body text-text-dim">{children}</p>
                {visual ? <div className="mt-6 flex-1">{visual}</div> : null}
            </div>
        </div>
    )
}

/** Mini planned-vs-actual bars for the headline feature card. */
function PlanVsActual() {
    const rows = [
        { label: 'Set 1', plan: 55, actual: 60 },
        { label: 'Set 2', plan: 70, actual: 72 },
        { label: 'Set 3', plan: 85, actual: 80 },
    ]
    return (
        <div className="space-y-3 rounded-2xl bg-bg/60 p-5 ring-1 ring-hairline">
            <div className="flex justify-between font-mono text-eyebrow uppercase text-text-faint">
                <span>Planned</span>
                <span className="text-ember">Logged</span>
            </div>
            {rows.map((r) => (
                <div key={r.label} className="space-y-1.5">
                    <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.05]">
                        <div
                            className="absolute inset-y-0 left-0 rounded-full bg-white/15"
                            style={{ width: `${r.plan}%` }}
                        />
                        <div
                            className="absolute inset-y-0 left-0 rounded-full bg-ember-gradient"
                            style={{ width: `${r.actual}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}

export function Features() {
    return (
        <section id="features" className="relative px-6 py-28 md:px-8 md:py-40">
            <div className="mx-auto max-w-[80rem]">
                <Reveal>
                    <Eyebrow>The instrument</Eyebrow>
                    <h2 className="mt-6 max-w-2xl font-display text-display">
                        Everything the bar deserves. Nothing it doesn&rsquo;t.
                    </h2>
                    <p className="mt-5 max-w-xl text-body-lg text-text-dim">
                        A fixed exercise catalog, a clean log, and the math that turns reps into a verdict.
                    </p>
                </Reveal>

                <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-12">
                    <Reveal className="md:col-span-7" delay={0}>
                        <Card
                            className="h-full"
                            icon={<Bolt className="size-5" />}
                            title="Plan vs. actual, every set"
                            visual={<PlanVsActual />}
                        >
                            Program targets — weight, reps, RPE or RIR — then log what really happened beside them.
                            powerlog keeps intent and reality on the same line, so honesty is the default.
                        </Card>
                    </Reveal>

                    <Reveal className="md:col-span-5" delay={80}>
                        <Card
                            className="h-full"
                            icon={<Target className="size-5" />}
                            title="e1RM & automatic PRs"
                            visual={
                                <div className="flex items-end justify-between rounded-2xl bg-bg/60 p-5 ring-1 ring-hairline">
                                    <div>
                                        <p className="font-mono text-eyebrow uppercase text-text-faint">Best e1RM</p>
                                        <p className="font-mono text-3xl tabular-nums text-text">207.5</p>
                                    </div>
                                    <span className="font-mono text-sm tabular-nums text-pr">+8.0kg ★</span>
                                </div>
                            }
                        >
                            Epley estimates from your real top sets, with personal records surfaced the moment you hit
                            them.
                        </Card>
                    </Reveal>

                    <Reveal className="md:col-span-4" delay={0}>
                        <Card icon={<ChartLine className="size-5" />} title="Analytics that don't lie">
                            Volume, intensity and 1RM trends per lift — grouped straight from the database, scoped to
                            you.
                        </Card>
                    </Reveal>

                    <Reveal className="md:col-span-4" delay={80}>
                        <Card icon={<Scale className="size-5" />} title="kg or lb, canonical">
                            Log in either unit. Weights are stored canonically and shown in your preference, never
                            rounded wrong.
                        </Card>
                    </Reveal>

                    <Reveal className="md:col-span-4" delay={160}>
                        <Card icon={<Calendar className="size-5" />} title="History & streaks">
                            Every session, keyset-paginated and fast — with the streaks that keep you under the bar.
                        </Card>
                    </Reveal>

                    <Reveal className="md:col-span-12" delay={0}>
                        <Card icon={<Users className="size-5" />} title="Built for coaches and athletes">
                            Coaches plan sessions straight into an athlete&rsquo;s log; athletes train and record the
                            real numbers. One link, two views, zero spreadsheets.
                        </Card>
                    </Reveal>
                </div>
            </div>
        </section>
    )
}
