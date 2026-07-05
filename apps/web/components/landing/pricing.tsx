import { cn } from '@/lib/cn'
import { PrimaryCta, SecondaryCta } from '@/components/ui/cta'
import { Check } from '@/components/ui/icons'
import { Eyebrow } from '@/components/ui/eyebrow'
import { Reveal } from '@/components/ui/reveal'

interface Plan {
    name: string
    price: string
    /** Optional struck-through former price (e.g. while a tier is free in beta). */
    originalPrice?: string
    cadence: string
    blurb: string
    features: string[]
    featured?: boolean
    cta: string
}

const PLANS: Plan[] = [
    {
        name: 'Solo',
        price: 'Free',
        cadence: 'forever',
        blurb: 'Everything a lifter needs to log and progress.',
        features: [
            'Unlimited sessions & sets',
            'e1RM and automatic PRs',
            'History, streaks & units',
            'Per-lift analytics',
        ],
        cta: 'Start free',
    },
    {
        name: 'Coach',
        price: 'Free',
        originalPrice: '€19',
        cadence: 'while in beta',
        blurb: 'Program for the athletes you train.',
        features: ['Everything in Solo', 'Invite & manage athletes', 'Plan sessions into their log', 'Roster overview'],
        featured: true,
        cta: 'Coach with powerlog',
    },
]

function PlanCard({ plan }: { plan: Plan }) {
    return (
        <div
            className={cn(
                'rounded-[2rem] p-1.5 ring-1',
                plan.featured ? 'bg-shell ring-ember/40 glow-ember' : 'bg-shell ring-hairline',
            )}
        >
            <div className="inset-hi flex h-full flex-col rounded-[calc(2rem-0.375rem)] bg-surface p-7 md:p-8">
                <div className="flex items-center justify-between">
                    <h3 className="font-display text-h3">{plan.name}</h3>
                    {plan.featured ? (
                        <span className="rounded-full bg-ember/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-ember">
                            Most popular
                        </span>
                    ) : null}
                </div>

                <div className="mt-5 flex items-baseline gap-2">
                    {plan.originalPrice ? (
                        <span className="font-display text-2xl font-semibold tracking-tight text-text-faint line-through decoration-ember/70">
                            {plan.originalPrice}
                        </span>
                    ) : null}
                    <span className="font-display text-5xl font-semibold tracking-tight tabular-nums">
                        {plan.price}
                    </span>
                    <span className="font-mono text-sm text-text-faint">{plan.cadence}</span>
                </div>
                <p className="mt-3 text-body text-text-dim">{plan.blurb}</p>

                <ul className="mt-7 flex-1 space-y-3">
                    {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-3 text-body text-text-dim">
                            <Check className="mt-0.5 size-4 shrink-0 text-ember" />
                            {f}
                        </li>
                    ))}
                </ul>

                <div className="mt-8">
                    {plan.featured ? (
                        <PrimaryCta href="/register" className="w-full justify-between" analyticsId="pricing-register">
                            {plan.cta}
                        </PrimaryCta>
                    ) : (
                        <SecondaryCta
                            href="/register"
                            className="w-full justify-center"
                            analyticsId="pricing-register-free"
                        >
                            {plan.cta}
                        </SecondaryCta>
                    )}
                </div>
            </div>
        </div>
    )
}

export function Pricing() {
    return (
        <section id="pricing" className="relative px-6 py-28 md:px-8 md:py-40">
            <div className="mx-auto max-w-[80rem]">
                <Reveal className="max-w-2xl">
                    <Eyebrow>Pricing</Eyebrow>
                    <h2 className="mt-6 font-display text-display">Free to lift. Free to coach.</h2>
                    <p className="mt-5 text-body-lg text-text-dim">
                        Everything is free while powerlog is in beta — log solo or program for a roster. Paid plans come
                        later; what you start today stays yours.
                    </p>
                </Reveal>

                <div className="mx-auto mt-14 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
                    {PLANS.map((plan, i) => (
                        <Reveal key={plan.name} delay={i * 90}>
                            <PlanCard plan={plan} />
                        </Reveal>
                    ))}
                </div>
            </div>
        </section>
    )
}
