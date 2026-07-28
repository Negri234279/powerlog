import { describe, expect, it } from 'vitest'

import { MessageEmptyError, MessageTooLongError } from '../errors/chat.errors'
import { MessageBodyVO } from './message-body.vo'

describe('MessageBodyVO', () => {
    it('should_trim_surrounding_whitespace_into_the_stored_value', () => {
        const body = MessageBodyVO.create('  hola coach  ')

        expect(body.value).toBe('hola coach')
    })

    it('should_reject_an_empty_body', () => {
        expect(() => MessageBodyVO.create('')).toThrow(MessageEmptyError)
    })

    it('should_reject_a_whitespace_only_body', () => {
        expect(() => MessageBodyVO.create('   \n\t ')).toThrow(MessageEmptyError)
    })

    it('should_accept_a_body_exactly_at_the_max_length', () => {
        const atMax = 'a'.repeat(MessageBodyVO.MAX_LENGTH)

        expect(MessageBodyVO.create(atMax).value).toHaveLength(MessageBodyVO.MAX_LENGTH)
    })

    it('should_reject_a_body_over_the_max_length', () => {
        const overMax = 'a'.repeat(MessageBodyVO.MAX_LENGTH + 1)

        expect(() => MessageBodyVO.create(overMax)).toThrow(MessageTooLongError)
    })

    it('should_measure_length_after_trimming', () => {
        // Padding that would push it over the limit is trimmed away first.
        const padded = `  ${'a'.repeat(MessageBodyVO.MAX_LENGTH)}  `

        expect(() => MessageBodyVO.create(padded)).not.toThrow()
    })

    it('should_equal_another_vo_with_the_same_trimmed_value', () => {
        expect(MessageBodyVO.create('hi').equals(MessageBodyVO.create(' hi '))).toBe(true)
        expect(MessageBodyVO.create('hi').equals(MessageBodyVO.create('bye'))).toBe(false)
    })
})
