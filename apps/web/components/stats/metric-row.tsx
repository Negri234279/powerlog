/**
 * One measure inside the execution panel: its label on its own line, then the
 * value, then whatever explains it.
 *
 * The label never sits inline beside the number — Spanish labels here run half
 * again as long as their English counterparts ("Carga vs. programada"), and
 * inline they would push the value around as the locale changes.
 */
export function MetricRow({
    label,
    children,
    meter,
}: {
    label: string
    children: React.ReactNode
    /** Optional bar under the value. */
    meter?: React.ReactNode
}) {
    return (
        <div className="border-t border-hairline/60 pt-4 first:border-0 first:pt-0">
            <p className="min-h-[2.5rem] text-sm text-text-dim">{label}</p>
            {children}
            {meter ? <div className="mt-3">{meter}</div> : null}
        </div>
    )
}
