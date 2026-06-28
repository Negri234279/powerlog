import { cn } from '@/lib/cn'

/** Microscopic pill badge that precedes major headings. */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-2 rounded-full px-3 py-1 ring-1 ring-hairline',
                'font-mono text-eyebrow uppercase text-text-dim',
                className,
            )}
        >
            <span className="size-1.5 rounded-full bg-ember-gradient" />
            {children}
        </span>
    )
}
