/** A numeric cap: `∞` when null (unlimited), the number otherwise; 0 reads as "off". */
export function CapPill({ label, cap }: { label: string; cap: number | null }) {
    const off = cap === 0

    return (
        <span
            className={`rounded-full px-3 py-1 font-mono text-eyebrow uppercase ${
                off ? 'bg-white/[0.03] text-text-faint line-through' : 'bg-ember/10 text-ember'
            }`}
        >
            {label}: {cap === null ? '∞' : cap}
        </span>
    )
}
