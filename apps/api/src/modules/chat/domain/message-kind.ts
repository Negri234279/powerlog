/**
 * Message kinds. Single source of truth for the domain, the `chat_message_kind`
 * pgEnum and input validation. Only `text` today; `image`/`file` are reserved
 * (each addition is an additive `ALTER TYPE ... ADD VALUE` + a real `kind`, never
 * a rewrite of existing rows — the `chat_messages.attachment_*` columns already
 * exist for it). Same pattern as `notification-type.ts`.
 */
export const MESSAGE_KINDS = ['text'] as const

export type MessageKind = (typeof MESSAGE_KINDS)[number]
