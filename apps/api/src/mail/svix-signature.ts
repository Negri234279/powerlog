import { createHmac, timingSafeEqual } from 'node:crypto'

/** Reject events whose timestamp is too far from now (replay protection). */
const TOLERANCE_MS = 5 * 60 * 1000

export interface SvixHeaders {
    id: string
    timestamp: string
    signature: string
}

/**
 * Verifies a Svix-signed webhook (Resend's signing scheme). The signed content is
 * `${id}.${timestamp}.${payload}`, HMAC-SHA256'd with the secret (the part after
 * the `whsec_` prefix, base64-decoded). The `svix-signature` header is a space-
 * delimited list of `v1,<base64sig>` tokens; the request is valid if any `v1`
 * signature matches (constant-time) and the timestamp is within tolerance.
 *
 * `payload` MUST be the raw request body (byte-for-byte), not a re-serialized JSON.
 */
export function verifySvixSignature(
    secret: string,
    headers: SvixHeaders,
    payload: string,
    now: number = Date.now(),
): boolean {
    if (!secret || !headers.id || !headers.timestamp || !headers.signature) return false

    const timestampSeconds = Number(headers.timestamp)
    if (!Number.isFinite(timestampSeconds)) return false
    if (Math.abs(now - timestampSeconds * 1000) > TOLERANCE_MS) return false

    const key = Buffer.from(secret.startsWith('whsec_') ? secret.slice('whsec_'.length) : secret, 'base64')
    const signedContent = `${headers.id}.${headers.timestamp}.${payload}`
    const expected = createHmac('sha256', key).update(signedContent).digest()

    for (const token of headers.signature.split(' ')) {
        const [version, sig] = token.split(',')
        if (version !== 'v1' || !sig) continue

        const provided = Buffer.from(sig, 'base64')
        if (provided.length === expected.length && timingSafeEqual(provided, expected)) return true
    }

    return false
}
