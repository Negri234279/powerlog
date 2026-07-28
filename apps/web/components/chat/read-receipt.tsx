import { cn } from '@/lib/cn'
import { Check, CheckDouble } from '@/components/ui/icons'

/**
 * The double-check on a message the caller sent, derived server-side from the
 * other participant's cursor: one tick sent, two ticks delivered, two blue read.
 * Received messages pass `null` and render nothing.
 */
export function ReadReceipt({ status }: { status: 'sent' | 'delivered' | 'read' | null }) {
    if (!status) return null

    if (status === 'sent') return <Check className="size-3.5 text-bg/50" />

    // Read is the bold, full-strength double tick; delivered is the faded one.
    return <CheckDouble className={cn('size-3.5', status === 'read' ? 'text-bg' : 'text-bg/50')} />
}
