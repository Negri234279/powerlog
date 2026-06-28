import { InvalidWorkoutCursorError } from '../../../domain/errors/workouts.errors'
import type { WorkoutHistoryCursor } from '../../ports/workout-history.read-model'

/**
 * Opaque, stable cursor over the (performedAt, id) keyset ordering. Encoded as
 * base64url of `<ISO performedAt>|<uuid>` so clients treat it as a token. The
 * separator is the last `|` (UUIDs never contain one).
 */
export function encodeWorkoutHistoryCursor(cursor: WorkoutHistoryCursor): string {
    const payload = `${cursor.performedAt.toISOString()}|${cursor.id}`
    return Buffer.from(payload, 'utf8').toString('base64url')
}

export function decodeWorkoutHistoryCursor(raw: string): WorkoutHistoryCursor {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8')
    const sep = decoded.lastIndexOf('|')

    if (sep === -1) {
        throw new InvalidWorkoutCursorError()
    }

    const id = decoded.slice(sep + 1)
    const performedAt = new Date(decoded.slice(0, sep))

    if (!id || Number.isNaN(performedAt.getTime())) {
        throw new InvalidWorkoutCursorError()
    }

    return {
        performedAt,
        id,
    }
}
