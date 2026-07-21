import { Skeleton } from '@/components/ui/skeleton'

/**
 * The panel chrome stays real while it loads — container, padding and title all
 * render; only the values become bars, sized to what replaces them. A single
 * block standing in for the whole panel would resize the page the moment the
 * data lands, which on a four-tab range control happens constantly.
 */
export function ExecutionSkeleton() {
    return (
        <div className="grid gap-4 lg:grid-cols-2" aria-busy>
            <div className="rounded-2xl bg-bg/40 p-5 ring-1 ring-hairline md:p-6">
                <Skeleton className="h-6 w-40 rounded-lg" />
                <Skeleton className="mt-2 h-4 w-56 rounded" />
                <Skeleton className="mt-8 h-9 w-28 rounded-lg" />
                <Skeleton className="mt-2 h-4 w-24 rounded" />
                <Skeleton className="mt-8 h-2 w-full rounded-full" />
                <Skeleton className="mt-3 h-3 w-48 rounded" />
            </div>

            <div className="rounded-2xl bg-bg/40 p-5 ring-1 ring-hairline md:p-6">
                <Skeleton className="h-6 w-44 rounded-lg" />
                <Skeleton className="mt-2 h-4 w-52 rounded" />
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="mt-6">
                        <Skeleton className="h-4 w-32 rounded" />
                        <Skeleton className="mt-2 h-7 w-24 rounded-lg" />
                        <Skeleton className="mt-2 h-2 w-full rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    )
}

/** Matches the workload strip: four stats in the same grid. */
export function WorkloadSkeleton() {
    return (
        <div className="rounded-2xl bg-bg/40 p-5 ring-1 ring-hairline md:p-6" aria-busy>
            <Skeleton className="h-3 w-32 rounded" />
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i}>
                        <Skeleton className="h-6 w-20 rounded-lg" />
                        <Skeleton className="mt-1.5 h-3 w-16 rounded" />
                    </div>
                ))}
            </div>
        </div>
    )
}
