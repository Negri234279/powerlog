import { cn } from '@/lib/cn'

/**
 * A single pulsing placeholder bar (transitions.dev `14-skeleton-reveal` pulse).
 * Compose a few of these in a list/card's loading branch instead of a bare
 * "Loading…" label. The pulse loops until the real content replaces it.
 */
export function Skeleton({ className }: { className?: string }) {
    return <div className={cn('t-skel-pulse rounded-md bg-white/[0.06]', className)} aria-hidden />
}

/** A stack of skeleton rows for tables/lists. */
export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
    return (
        <div className={cn('space-y-3', className)} aria-busy aria-live="polite">
            {Array.from({ length: rows }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
            ))}
        </div>
    )
}
