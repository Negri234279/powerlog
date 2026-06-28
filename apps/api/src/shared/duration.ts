const UNIT_MS = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
} as const

/**
 * Parse a short duration string ("15m", "30d", "3600s", "500ms") to
 * milliseconds. Used for refresh TTL and cookie max-age.
 */
export function parseDurationMs(input: string): number {
    const match = /^(\d+)(ms|s|m|h|d)$/.exec(input.trim())
    if (!match) {
        throw new Error(`Invalid duration: "${input}". Expected e.g. "15m", "30d".`)
    }

    const unit = match[2] as keyof typeof UNIT_MS
    return Number(match[1]) * UNIT_MS[unit]
}
