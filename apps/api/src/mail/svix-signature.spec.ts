import { createHmac } from 'node:crypto'

import { describe, expect, it } from 'vitest'

import { type SvixHeaders, verifySvixSignature } from './svix-signature'

const SECRET = 'whsec_MfKQ9r8GKYqrTwjUPD8ILPZIo2LaLaSw' // sample base64 secret
const PAYLOAD = '{"type":"email.delivered","data":{"email_id":"abc"}}'

/** Signs a payload the way Svix/Resend does, to drive the verifier. */
function sign(id: string, timestampSeconds: number, payload: string, secret = SECRET): string {
    const key = Buffer.from(secret.slice('whsec_'.length), 'base64')
    const sig = createHmac('sha256', key).update(`${id}.${timestampSeconds}.${payload}`).digest('base64')
    return `v1,${sig}`
}

const NOW = 1_782_000_000_000
const TS = Math.floor(NOW / 1000)

function headers(overrides: Partial<SvixHeaders> = {}): SvixHeaders {
    return { id: 'msg_1', timestamp: String(TS), signature: sign('msg_1', TS, PAYLOAD), ...overrides }
}

describe('verifySvixSignature', () => {
    it('accepts a correctly signed payload', () => {
        expect(verifySvixSignature(SECRET, headers(), PAYLOAD, NOW)).toBe(true)
    })

    it('accepts when one of several signatures matches', () => {
        const multi = `v1,not-the-right-sig ${sign('msg_1', TS, PAYLOAD)}`
        expect(verifySvixSignature(SECRET, headers({ signature: multi }), PAYLOAD, NOW)).toBe(true)
    })

    it('rejects a tampered payload', () => {
        expect(verifySvixSignature(SECRET, headers(), `${PAYLOAD} `, NOW)).toBe(false)
    })

    it('rejects a wrong secret', () => {
        expect(verifySvixSignature('whsec_AAAAAAAAAAAAAAAAAAAAAAAAAAAA', headers(), PAYLOAD, NOW)).toBe(false)
    })

    it('rejects a stale timestamp (replay)', () => {
        const oldTs = Math.floor((NOW - 10 * 60 * 1000) / 1000)
        const stale = headers({ timestamp: String(oldTs), signature: sign('msg_1', oldTs, PAYLOAD) })
        expect(verifySvixSignature(SECRET, stale, PAYLOAD, NOW)).toBe(false)
    })

    it('rejects missing headers or empty secret', () => {
        expect(verifySvixSignature('', headers(), PAYLOAD, NOW)).toBe(false)
        expect(verifySvixSignature(SECRET, headers({ signature: '' }), PAYLOAD, NOW)).toBe(false)
    })
})
