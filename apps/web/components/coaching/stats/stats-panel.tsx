/**
 * The shell both execution panels share. The scope line under the title is the
 * only explanatory prose on the whole tab, and it earns its place: the two
 * panels measure different populations, and without it two percentages sitting
 * side by side would silently invite the wrong comparison.
 */
export function StatsPanel({ title, scope, children }: { title: string; scope: string; children: React.ReactNode }) {
    return (
        <section className="flex flex-col rounded-2xl bg-bg/40 p-5 ring-1 ring-hairline md:p-6">
            <h3 className="font-display text-h3 tracking-tight">{title}</h3>
            <p className="mt-1 min-h-[2.5rem] text-sm text-text-dim">{scope}</p>

            <div className="mt-5 flex flex-1 flex-col">{children}</div>
        </section>
    )
}
