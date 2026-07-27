/**
 * Derivation of a message's double-check status from the RECEIVER's cursor.
 *
 * Nothing here is persisted per message: `ParticipantStateEntity` stores one
 * delivered/read cursor per participant, and the status of any given message is
 * computed by comparing it against the other side's cursor. Messages are totally
 * ordered by the `(createdAt, id)` keyset, so "the receiver read up to message X"
 * means every message at or before X's key is `read`.
 */

export type ReadStatus = 'sent' | 'delivered' | 'read'

/** A point in the `(createdAt, id)` keyset ordering of a conversation. */
export interface MessageKey {
    createdAt: Date
    id: string
}

/** The receiver's cursor, expressed as the keys their cursor ids point at. */
export interface ReceiverCursor {
    delivered: MessageKey | null
    read: MessageKey | null
}

/** `< 0` if a precedes b, `0` if equal, `> 0` if a follows b. */
function compareKeys(a: MessageKey, b: MessageKey): number {
    const byTime = a.createdAt.getTime() - b.createdAt.getTime()
    if (byTime !== 0) return byTime
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

/** True when `key` is at or before `boundary` (i.e. covered by that cursor). */
function atOrBefore(key: MessageKey, boundary: MessageKey | null): boolean {
    return boundary !== null && compareKeys(key, boundary) <= 0
}

/**
 * The double-check status of a message from the sender's point of view, given
 * the receiver's cursor. `read` wins over `delivered` wins over `sent`.
 */
export function deriveReadStatus(message: MessageKey, receiver: ReceiverCursor): ReadStatus {
    if (atOrBefore(message, receiver.read)) return 'read'
    if (atOrBefore(message, receiver.delivered)) return 'delivered'
    return 'sent'
}
