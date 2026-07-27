'use client'

import { Conversation } from '@/components/chat/conversation'
import { Spinner } from '@/components/ui/icons'
import { useConversationWith } from '@/lib/graphql/hooks/use-chat'
import { useMyAthlete } from '@/lib/graphql/hooks/use-coaching'

/**
 * The coach's chat with one athlete, living in the athlete-detail layout so it
 * survives section changes (Training / Stats / Plan). A side rail from `xl`; on
 * narrower screens it stacks below the section content. Writable while linked,
 * read-only once the athlete has left (history stays).
 */
export function AthleteChatRail({ athleteId }: { athleteId: string }) {
    const athlete = useMyAthlete(athleteId)
    const { conversation, isLoading } = useConversationWith(athleteId)

    const linked = Boolean(athlete.data)
    const loading = athlete.isLoading || isLoading

    return (
        <aside className="h-[32rem] xl:sticky xl:top-24 xl:h-[calc(100dvh-9rem)]">
            {loading ? (
                <div className="flex h-full items-center justify-center rounded-2xl bg-surface ring-1 ring-hairline">
                    <Spinner className="size-5 animate-spin text-text-faint" />
                </div>
            ) : conversation ? (
                <Conversation
                    conversationId={conversation.conversationId}
                    otherParticipantId={athleteId}
                    otherName={athlete.data?.username ?? ''}
                    otherAvatarUrl={athlete.data?.avatarUrl}
                    initialPresence={conversation.presence}
                    readOnly={!linked}
                />
            ) : null}
        </aside>
    )
}
