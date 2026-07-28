import { describe, expect, it } from 'vitest'

import { deriveReadStatus, type MessageKey, type ReceiverCursor } from './read-status'

const key = (iso: string, id: string): MessageKey => ({ createdAt: new Date(iso), id })

describe('deriveReadStatus', () => {
    const m1 = key('2026-07-27T10:00:00Z', 'aaaa')
    const m2 = key('2026-07-27T10:01:00Z', 'bbbb')
    const m3 = key('2026-07-27T10:02:00Z', 'cccc')

    it('should_be_sent_when_the_receiver_has_no_cursor', () => {
        const receiver: ReceiverCursor = { delivered: null, read: null }

        expect(deriveReadStatus(m1, receiver)).toBe('sent')
    })

    it('should_be_delivered_up_to_the_delivered_cursor_but_not_read', () => {
        const receiver: ReceiverCursor = { delivered: m2, read: null }

        expect(deriveReadStatus(m1, receiver)).toBe('delivered')
        expect(deriveReadStatus(m2, receiver)).toBe('delivered')
        expect(deriveReadStatus(m3, receiver)).toBe('sent')
    })

    it('should_be_read_up_to_the_read_cursor', () => {
        const receiver: ReceiverCursor = { delivered: m3, read: m2 }

        expect(deriveReadStatus(m1, receiver)).toBe('read')
        expect(deriveReadStatus(m2, receiver)).toBe('read')
        expect(deriveReadStatus(m3, receiver)).toBe('delivered')
    })

    it('should_let_read_win_over_delivered_at_the_same_message', () => {
        const receiver: ReceiverCursor = { delivered: m2, read: m2 }

        expect(deriveReadStatus(m2, receiver)).toBe('read')
    })

    it('should_break_ties_on_id_when_timestamps_match', () => {
        const a = key('2026-07-27T10:00:00Z', 'aaaa')
        const b = key('2026-07-27T10:00:00Z', 'bbbb')
        const receiver: ReceiverCursor = { delivered: null, read: a }

        expect(deriveReadStatus(a, receiver)).toBe('read')
        // b shares the timestamp but sorts after a, so it's beyond the read cursor.
        expect(deriveReadStatus(b, receiver)).toBe('sent')
    })
})
