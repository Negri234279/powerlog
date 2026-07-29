'use client'

import { useTranslations } from 'next-intl'
import { type MouseEvent, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { InboxRow } from '@/components/chat/inbox-row'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { EllipsisVertical } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'
import { cn } from '@/lib/cn'
import { type ChatConversation, useClearConversation, useDeleteConversation } from '@/lib/graphql/hooks/use-chat'
import { useErrorMessage } from '@/lib/graphql/use-error-message'

/** Cursor/anchor coordinates the actions menu opens at (viewport-fixed). */
type MenuPos = { x: number; y: number }
/** Which destructive action is awaiting confirmation. */
type Pending = 'clear' | 'delete'

// Menu box size, used to clamp it inside the viewport so it never overflows.
const MENU_WIDTH = 180
const MENU_HEIGHT = 96

/**
 * An inbox row with a WhatsApp-style actions menu: right-click anywhere on the row
 * (desktop) or tap the ⋮ button (always reachable, incl. touch) to "clear chat" or
 * "delete chat". Both are per-user — they only change the caller's own view (see the
 * chat module). Shared by the /chat page and the floating widget.
 */
export function ConversationRow({
    row,
    selected = false,
    meId,
    onSelect,
    onDeleted,
}: {
    row: ChatConversation
    selected?: boolean
    meId: string | undefined
    onSelect: () => void
    /** Called after a successful delete, so the parent can deselect an open thread. */
    onDeleted?: (conversationId: string) => void
}) {
    const t = useTranslations('chat')
    const errorMessage = useErrorMessage()
    const clear = useClearConversation()
    const del = useDeleteConversation()

    const [menuPos, setMenuPos] = useState<MenuPos | null>(null)
    const [pending, setPending] = useState<Pending | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)

    // Close the menu on outside pointerdown or Escape (the modals own their own).
    useEffect(() => {
        if (!menuPos) return

        const close = () => setMenuPos(null)
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close()
        }
        document.addEventListener('pointerdown', close)
        document.addEventListener('keydown', onKey)

        return () => {
            document.removeEventListener('pointerdown', close)
            document.removeEventListener('keydown', onKey)
        }
    }, [menuPos])

    function onContextMenu(e: MouseEvent) {
        e.preventDefault()
        setMenuPos({ x: e.clientX, y: e.clientY })
    }

    function onKebab(e: MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        const rect = e.currentTarget.getBoundingClientRect()
        setMenuPos({ x: rect.right, y: rect.bottom + 4 })
    }

    function ask(action: Pending) {
        setActionError(null)
        setMenuPos(null)
        setPending(action)
    }

    function onConfirm() {
        if (!pending) return
        const mutation = pending === 'clear' ? clear : del

        mutation.mutate(row.conversationId, {
            onSuccess: () => {
                if (pending === 'delete') onDeleted?.(row.conversationId)
                setPending(null)
            },
            onError: (error) => setActionError(errorMessage(error)),
        })
    }

    const busy = clear.isPending || del.isPending
    // Clamp inside the viewport. Guarded for SSR: `window` is read only when the
    // menu is open, which can only happen after a client-side event.
    const viewportW = typeof window !== 'undefined' ? window.innerWidth : 0
    const viewportH = typeof window !== 'undefined' ? window.innerHeight : 0
    const left = menuPos ? Math.max(8, Math.min(menuPos.x, viewportW - MENU_WIDTH - 8)) : 0
    const top = menuPos ? Math.max(8, Math.min(menuPos.y, viewportH - MENU_HEIGHT - 8)) : 0

    return (
        <div className="group relative flex items-stretch" onContextMenu={onContextMenu}>
            <InboxRow row={row} selected={selected} meId={meId} onSelect={onSelect} className="flex-1" />

            {/* Kebab: hover-revealed on desktop, always visible on touch (no hover). */}
            <TrackedButton
                analyticsId="chat-row-menu"
                type="button"
                aria-label={t('rowMenu')}
                aria-haspopup="menu"
                onClick={onKebab}
                className={cn(
                    'grid w-9 shrink-0 place-items-center text-text-faint transition-colors duration-200 hover:text-text',
                    'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100',
                    menuPos && 'opacity-100',
                )}
            >
                <EllipsisVertical className="size-4" />
            </TrackedButton>

            {menuPos
                ? createPortal(
                      <div
                          role="menu"
                          style={{ position: 'fixed', top, left }}
                          // Keep our own pointerdown from bubbling to the document closer.
                          onPointerDown={(e) => e.stopPropagation()}
                          className="z-50 min-w-44 overflow-hidden rounded-2xl bg-shell p-1 shadow-xl ring-1 ring-hairline"
                      >
                          <TrackedButton
                              analyticsId="chat-row-clear-open"
                              type="button"
                              role="menuitem"
                              onClick={() => ask('clear')}
                              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-text-dim transition-colors duration-200 hover:bg-white/[0.05] hover:text-text"
                          >
                              {t('clearChat')}
                          </TrackedButton>
                          <TrackedButton
                              analyticsId="chat-row-delete-open"
                              type="button"
                              role="menuitem"
                              onClick={() => ask('delete')}
                              className="block w-full rounded-xl px-3 py-2 text-left text-sm text-text-dim transition-colors duration-200 hover:bg-ember/10 hover:text-ember"
                          >
                              {t('deleteChat')}
                          </TrackedButton>
                      </div>,
                      document.body,
                  )
                : null}

            <ConfirmModal
                open={pending !== null}
                onClose={() => setPending(null)}
                onConfirm={onConfirm}
                title={pending === 'delete' ? t('deleteChatTitle') : t('clearChatTitle')}
                description={
                    pending === 'delete'
                        ? t('deleteChatBody', { user: row.otherParticipant.username })
                        : t('clearChatBody', { user: row.otherParticipant.username })
                }
                confirmLabel={pending === 'delete' ? t('deleteChat') : t('clearChat')}
                cancelLabel={t('cancel')}
                destructive
                pending={busy}
                error={actionError}
                analyticsId={`chat-row-${pending ?? 'action'}`}
            />
        </div>
    )
}
