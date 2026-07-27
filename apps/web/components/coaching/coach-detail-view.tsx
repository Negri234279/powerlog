'use client'

import { useTranslations } from 'next-intl'

import { Conversation } from '@/components/chat/conversation'
import { ChevronLeft, Spinner } from '@/components/ui/icons'
import { TrackedLink } from '@/components/ui/tracked'
import { useConversationWith } from '@/lib/graphql/hooks/use-chat'
import { useMyCoaches } from '@/lib/graphql/hooks/use-coaching'

/**
 * The athlete's chat with one coach, full-width under a back link. Writable while
 * the link is live; read-only (history only) if the athlete has left the coach
 * but the conversation still exists. Resolves the conversation from the inbox by
 * the coach's id — the same seam the coach's rail uses.
 */
export function CoachDetailView({ coachId }: { coachId: string }) {
    const t = useTranslations('coaching')
    const coaches = useMyCoaches()
    const { conversation, isLoading } = useConversationWith(coachId)

    const coach = coaches.data?.find((c) => c.userId === coachId)
    // Linked → writable. Not linked but a conversation exists → read-only history.
    const linked = Boolean(coach)
    const loading = coaches.isLoading || isLoading

    return (
        <div className="space-y-6">
            <TrackedLink
                analyticsId="coach-detail-back"
                href="/coaching"
                className="-ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-text-dim transition-colors duration-300 hover:text-text"
            >
                <ChevronLeft className="size-4" />
                {t('backToCoaching')}
            </TrackedLink>

            {loading ? (
                <div className="flex h-[24rem] items-center justify-center rounded-2xl bg-surface ring-1 ring-hairline">
                    <Spinner className="size-5 animate-spin text-text-faint" />
                </div>
            ) : conversation ? (
                <div className="h-[calc(100dvh-15rem)] min-h-[28rem]">
                    <Conversation
                        conversationId={conversation.conversationId}
                        otherParticipantId={coachId}
                        otherName={coach?.username ?? ''}
                        otherAvatarUrl={coach?.avatarUrl}
                        initialPresence={conversation.presence}
                        readOnly={!linked}
                    />
                </div>
            ) : (
                <div className="rounded-2xl bg-surface p-8 text-center ring-1 ring-hairline">
                    <p className="text-sm text-text-faint">{t('coachEmptyBody')}</p>
                </div>
            )}
        </div>
    )
}
