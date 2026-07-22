import { InvalidAiDraftCursorError } from '../../../domain/errors/ai-plan.errors'
import type { AiDraftHistoryCursor } from '../../ports/ai-draft-history.read-model'

/**
 * Opaque, stable cursor over the (updatedAt, id) keyset ordering. Encoded as
 * base64url of `<ISO updatedAt>|<uuid>` so clients treat it as a token. The
 * separator is the last `|` (UUIDs never contain one).
 */
export function encodeAiDraftHistoryCursor(cursor: AiDraftHistoryCursor): string {
    const payload = `${cursor.updatedAt.toISOString()}|${cursor.id}`
    return Buffer.from(payload, 'utf8').toString('base64url')
}

export function decodeAiDraftHistoryCursor(raw: string): AiDraftHistoryCursor {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8')
    const sep = decoded.lastIndexOf('|')

    if (sep === -1) {
        throw new InvalidAiDraftCursorError()
    }

    const id = decoded.slice(sep + 1)
    const updatedAt = new Date(decoded.slice(0, sep))

    if (!id || Number.isNaN(updatedAt.getTime())) {
        throw new InvalidAiDraftCursorError()
    }

    return {
        updatedAt,
        id,
    }
}
