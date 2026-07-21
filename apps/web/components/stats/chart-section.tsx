import { Skeleton } from '@/components/ui/skeleton'

/**
 * A titled chart block. The `scope` line is not decoration: this tab mixes two
 * populations (what the coach programmed vs everything the athlete trains), and
 * a chart with no scope stated is a chart the coach can misread — the same rule
 * the panels above establish with their possessive titles.
 */
export function ChartSection({
    title,
    scope,
    action,
    loading,
    empty,
    children,
}: {
    title: string
    scope: string
    action?: React.ReactNode
    loading?: boolean
    /** Shown instead of the chart when there is nothing to plot. */
    empty?: string | null
    children: React.ReactNode
}) {
    return (
        <section className="rounded-2xl bg-bg/40 p-5 ring-1 ring-hairline md:p-6">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h3 className="font-display text-h3 tracking-tight">{title}</h3>
                    <p className="mt-1 text-sm text-text-dim">{scope}</p>
                </div>
                {action}
            </div>

            {/* The skeleton is the chart's own height, so the page doesn't jump
                by 224px the moment the series arrives. */}
            {loading ? (
                <Skeleton className="h-56 w-full rounded-2xl" />
            ) : empty ? (
                <p className="text-sm text-text-faint">{empty}</p>
            ) : (
                children
            )}
        </section>
    )
}
