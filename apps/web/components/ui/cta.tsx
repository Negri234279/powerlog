import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { ArrowUpRight } from './icons'

interface CtaProps {
    href: string
    children: ReactNode
    className?: string
    /** Stable id for this CTA, surfaced on PostHog autocapture clicks as `cta`. */
    analyticsId?: string
}

/** Tag the element so PostHog autocapture attaches a stable `cta` property
 *  (lets you break clicks down by intent instead of brittle text/href). */
function ctaAttrs(analyticsId?: string): Record<string, string> {
    return analyticsId ? { 'data-ph-capture-attribute-cta': analyticsId } : {}
}

/**
 * Primary CTA — ember pill with the "button-in-button" trailing arrow nested in
 * its own circle, flush right. Presses down and the inner circle drifts on hover.
 */
export function PrimaryCta({ href, children, className, analyticsId }: CtaProps) {
    return (
        <a
            href={href}
            {...ctaAttrs(analyticsId)}
            className={cn(
                'group inline-flex items-center gap-3 rounded-full bg-ember-gradient py-2 pr-2 pl-6',
                'font-medium text-bg glow-ember transition-transform duration-300 ease-spring active:scale-[0.98]',
                className,
            )}
        >
            <span className="text-sm tracking-tight">{children}</span>
            <span className="grid size-9 place-items-center rounded-full bg-black/15 transition-transform duration-300 ease-spring group-hover:translate-x-0.5 group-hover:-translate-y-px group-hover:scale-105">
                <ArrowUpRight className="size-4" />
            </span>
        </a>
    )
}

/** Secondary CTA — ghost pill with a hairline ring. */
export function SecondaryCta({ href, children, className, analyticsId }: CtaProps) {
    return (
        <a
            href={href}
            {...ctaAttrs(analyticsId)}
            className={cn(
                'group inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-text',
                'ring-1 ring-hairline transition-colors duration-300 ease-spring hover:bg-white/[0.04]',
                className,
            )}
        >
            {children}
        </a>
    )
}
