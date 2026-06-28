import { InvalidNotificationCursorError } from '../../../domain/errors/notifications.errors'
import type { NotificationCursor } from '../../../domain/repositories/notification.repository'

/**
 * Opaque, stable cursor over the (createdAt, id) keyset ordering. Encoded as
 * base64url of `<ISO createdAt>|<uuid>` so clients treat it as a token. The
 * separator is the last `|` (UUIDs never contain one).
 */
export function encodeNotificationCursor(cursor: NotificationCursor): string {
    const payload = `${cursor.createdAt.toISOString()}|${cursor.id}`
    return Buffer.from(payload, 'utf8').toString('base64url')
}

export function decodeNotificationCursor(raw: string): NotificationCursor {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8')
    const sep = decoded.lastIndexOf('|')
    if (sep === -1) throw new InvalidNotificationCursorError()

    const id = decoded.slice(sep + 1)
    const createdAt = new Date(decoded.slice(0, sep))
    if (!id || Number.isNaN(createdAt.getTime())) throw new InvalidNotificationCursorError()

    return { createdAt, id }
}
