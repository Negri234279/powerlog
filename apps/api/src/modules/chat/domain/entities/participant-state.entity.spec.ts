import { describe, expect, it } from 'vitest'

import { ParticipantStateEntity } from './participant-state.entity'

const CONVERSATION = 'conv-1'
const USER = 'user-1'
const NOW = new Date('2026-01-01T12:00:00.000Z')

describe('ParticipantStateEntity', () => {
    it('should_start_with_no_clear_or_hide_watermark', () => {
        const state = ParticipantStateEntity.empty(CONVERSATION, USER)

        expect(state.clearedAt).toBeNull()
        expect(state.hiddenAt).toBeNull()
    })

    it('should_stamp_only_the_clear_watermark_on_clear', () => {
        const state = ParticipantStateEntity.empty(CONVERSATION, USER)

        state.clear(NOW)

        expect(state.clearedAt).toEqual(NOW)
        expect(state.hiddenAt).toBeNull()
    })

    it('should_stamp_both_clear_and_hide_watermarks_on_delete', () => {
        const state = ParticipantStateEntity.empty(CONVERSATION, USER)

        state.hide(NOW)

        expect(state.clearedAt).toEqual(NOW)
        expect(state.hiddenAt).toEqual(NOW)
    })

    it('should_preserve_the_read_cursor_when_clearing', () => {
        const state = ParticipantStateEntity.empty(CONVERSATION, USER)
        state.markRead('m-1', new Date('2026-01-01T10:00:00.000Z'))

        state.clear(NOW)

        expect(state.lastReadMessageId).toBe('m-1')
        expect(state.clearedAt).toEqual(NOW)
    })
})
