'use client'

import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'

import { ChatSendError } from '@/lib/chat/chat-socket'
import { cn } from '@/lib/cn'
import { FormError } from '@/components/ui/form-error'
import { Send, Spinner } from '@/components/ui/icons'
import { TrackedButton } from '@/components/ui/tracked'

const MAX_HEIGHT_PX = 160

/**
 * The message composer: an auto-growing textarea + send. Enter sends,
 * Shift+Enter breaks the line. Emits "typing…" as the user writes (the hook
 * throttles it) and surfaces a send failure inline — most usefully the read-only
 * one, when the coach↔athlete link is gone.
 */
export function Composer({ onSend, onTyping }: { onSend: (body: string) => Promise<void>; onTyping: () => void }) {
    const t = useTranslations('chat')
    const [value, setValue] = useState('')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const ref = useRef<HTMLTextAreaElement>(null)

    function resize() {
        const el = ref.current
        if (!el) return
        el.style.height = 'auto'
        el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`
    }

    async function submit() {
        const body = value.trim()
        if (!body || sending) return

        setError(null)
        setSending(true)
        try {
            await onSend(body)
            setValue('')
            requestAnimationFrame(resize)
        } catch (err) {
            setError(
                err instanceof ChatSendError && err.code === 'CONVERSATION_READ_ONLY' ? t('readOnly') : t('sendError'),
            )
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="border-t border-hairline px-3 py-3">
            <FormError error={error} className="mb-2" />
            <div className="flex items-end gap-2">
                <textarea
                    ref={ref}
                    value={value}
                    rows={1}
                    placeholder={t('placeholder')}
                    onChange={(e) => {
                        setValue(e.target.value)
                        resize()
                        onTyping()
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            void submit()
                        }
                    }}
                    className="max-h-40 min-h-[2.5rem] flex-1 resize-none rounded-2xl bg-bg/60 px-4 py-2.5 text-sm text-text ring-1 ring-hairline outline-none transition-colors duration-300 placeholder:text-text-faint focus:ring-ember/50"
                />
                <TrackedButton
                    analyticsId="chat-send"
                    type="button"
                    onClick={() => void submit()}
                    disabled={sending || value.trim() === ''}
                    aria-label={t('send')}
                    className={cn(
                        'grid size-10 shrink-0 place-items-center rounded-full bg-ember-gradient text-bg transition-transform duration-300 ease-spring active:scale-95 disabled:opacity-40',
                    )}
                >
                    {sending ? <Spinner className="size-4 animate-spin" /> : <Send className="size-4" />}
                </TrackedButton>
            </div>
        </div>
    )
}
