import { cn } from '@/lib/cn'
import { ReadReceipt } from '@/components/chat/read-receipt'
import type { ChatMessage } from '@/lib/graphql/hooks/use-chat'

function timeOf(iso: string, locale: string): string {
    return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
}

/**
 * One chat message. Mine hug the right in an ember bubble; the other side's hug
 * the left in a neutral one. `tail` rounds the corner nearest the sender only on
 * the last bubble of a run, so a group reads as one unit.
 */
export function MessageBubble({
    message,
    mine,
    tail,
    locale,
}: {
    message: ChatMessage
    mine: boolean
    tail: boolean
    locale: string
}) {
    return (
        <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
            <div
                className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2 sm:max-w-[70%]',
                    mine ? 'bg-ember-gradient text-bg' : 'bg-white/[0.05] text-text ring-1 ring-hairline',
                    tail && (mine ? 'rounded-br-md' : 'rounded-bl-md'),
                )}
            >
                <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.body}</p>
                <div
                    className={cn(
                        'mt-0.5 flex items-center justify-end gap-1 text-[10px]',
                        mine ? 'text-bg/60' : 'text-text-faint',
                    )}
                >
                    <span className="tabular-nums">{timeOf(message.createdAt, locale)}</span>
                    {mine ? <ReadReceipt status={message.status} /> : null}
                </div>
            </div>
        </div>
    )
}
