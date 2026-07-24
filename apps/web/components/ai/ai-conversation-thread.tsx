'use client'

import { useLocale, useTranslations } from 'next-intl'

/**
 * The conversation that produced a proposal, read-only.
 *
 * An ordered list with a real text label per turn, not colour alone: the panels
 * distinguish the athlete's words from the model's by text tone, which does not
 * survive a screen reader. `whitespace-pre-wrap` keeps the model's paragraphs —
 * its answers are prose, and collapsing them makes a rationale unreadable.
 */
export function AiConversationThread({
    messages,
    model,
}: {
    messages: readonly { id: string; role: string; content: string; createdAt: string }[]
    model: string
}) {
    const t = useTranslations('aiHistory.thread')
    const locale = useLocale()

    return (
        <ol aria-label={t('label', { count: messages.length })} className="space-y-5">
            {messages.map((message) => {
                const mine = message.role === 'user'

                return (
                    <li key={message.id}>
                        <p className="font-mono text-eyebrow uppercase text-text-faint">
                            {mine ? t('you') : model} ·{' '}
                            <time dateTime={message.createdAt}>
                                {new Date(message.createdAt).toLocaleString(locale, {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                })}
                            </time>
                        </p>
                        <p className={`mt-1 whitespace-pre-wrap text-sm ${mine ? 'text-text' : 'text-text-dim'}`}>
                            {/* Quotes mark the athlete's literal words, and only those. */}
                            {mine ? `“${message.content}”` : message.content}
                        </p>
                    </li>
                )
            })}
        </ol>
    )
}
