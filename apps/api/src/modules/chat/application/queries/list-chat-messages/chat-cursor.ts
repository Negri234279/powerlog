import { InvalidChatCursorError } from '../../../domain/errors/chat.errors'
import type { ChatCursor } from '../../../domain/repositories/message.repository'

/**
 * Opaque, stable cursor over the (createdAt, id) keyset ordering of a
 * conversation's messages. Encoded as base64url of `<ISO createdAt>|<uuid>` so
 * clients treat it as a token. The separator is the last `|` (UUIDs never
 * contain one). Same scheme as `notification-cursor.ts`.
 */
export function encodeChatCursor(cursor: ChatCursor): string {
    const payload = `${cursor.createdAt.toISOString()}|${cursor.id}`
    return Buffer.from(payload, 'utf8').toString('base64url')
}

export function decodeChatCursor(raw: string): ChatCursor {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8')
    const sep = decoded.lastIndexOf('|')
    if (sep === -1) {
        throw new InvalidChatCursorError()
    }

    const id = decoded.slice(sep + 1)
    const createdAt = new Date(decoded.slice(0, sep))
    if (!id || Number.isNaN(createdAt.getTime())) {
        throw new InvalidChatCursorError()
    }

    return {
        createdAt,
        id,
    }
}
