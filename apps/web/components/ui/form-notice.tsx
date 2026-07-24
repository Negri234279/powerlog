import { cn } from '@/lib/cn'

/**
 * Neutral, informational banner for form context (e.g. "your session expired").
 * The quiet sibling of `FormError` — no alarm color, `role="status"` so it's
 * announced politely rather than assertively.
 */
export function FormNotice({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <p
            role="status"
            className={cn('rounded-2xl bg-bg/60 px-4 py-3 text-sm text-text-dim ring-1 ring-hairline', className)}
        >
            {children}
        </p>
    )
}
