import { useTranslations } from 'next-intl'

import { draftTitle } from '@/lib/ai/draft-title'
import { cn } from '@/lib/cn'

/**
 * The line that makes a conversation recognisable. It leads the row because it
 * is the only field written in the user's own words — everything else (model,
 * kind, counts) is metadata.
 *
 * The three cases are styled differently on purpose: quotes mark a real quote,
 * so the model's proposed block name doesn't get them, and a draft nobody asked
 * anything for is dimmed rather than dressed up as a title it never had.
 */
export function AiDraftTitle({
    draft,
    className,
}: {
    draft: { title: string | null; name: string | null; kind: string }
    className?: string
}) {
    const t = useTranslations('aiHistory.untitled')
    const title = draftTitle(draft)

    if (title.kind === 'none') {
        return <span className={cn('text-text-dim', className)}>{t(title.of)}</span>
    }

    return <span className={className}>{title.kind === 'request' ? `“${title.text}”` : title.text}</span>
}
