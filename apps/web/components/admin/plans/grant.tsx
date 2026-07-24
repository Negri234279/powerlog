/** A boolean entitlement: highlighted when granted, struck through when not. */
export function Grant({ label, on }: { label: string; on: boolean }) {
    return (
        <span
            className={`rounded-full px-3 py-1 font-mono text-eyebrow uppercase ${
                on ? 'bg-ember/10 text-ember' : 'bg-white/[0.03] text-text-faint line-through'
            }`}
        >
            {label}
        </span>
    )
}
