import { describe, expect, it } from 'vitest'

import { InvalidRepsError, MalformedRangeError, ReversedRangeError } from '../errors/workouts.errors'
import { RepsRangeVO } from './reps-range.vo'
import { parseRangeText } from './range.vo'

describe('parseRangeText', () => {
    it('reads a single number as a range whose bounds coincide', () => {
        expect(parseRangeText('5')).toEqual({ min: 5, max: 5 })
    })

    it('reads a hyphenated pair as its two bounds', () => {
        expect(parseRangeText('5-8')).toEqual({ min: 5, max: 8 })
    })

    it('accepts decimals with either separator, so a Spanish keyboard works', () => {
        expect(parseRangeText('52.5')).toEqual({ min: 52.5, max: 52.5 })
        expect(parseRangeText('52,5')).toEqual({ min: 52.5, max: 52.5 })
    })

    it('tolerates surrounding and inner whitespace', () => {
        expect(parseRangeText('  50 - 55 ')).toEqual({ min: 50, max: 55 })
    })

    it('rejects anything that is not a number or a number-number pair', () => {
        expect(() => parseRangeText('al fallo')).toThrow(MalformedRangeError)
        expect(() => parseRangeText('')).toThrow(MalformedRangeError)
        expect(() => parseRangeText('~60')).toThrow(MalformedRangeError)
        expect(() => parseRangeText('5-8-10')).toThrow(MalformedRangeError)
        expect(() => parseRangeText('5-')).toThrow(MalformedRangeError)
        expect(() => parseRangeText('-5')).toThrow(MalformedRangeError)
    })
})

describe('RangeVO', () => {
    it('exposes both bounds', () => {
        const range = RepsRangeVO.parse('5-8')

        expect(range.min.value).toBe(5)
        expect(range.max.value).toBe(8)
    })

    it('reports a single value as such, and a span as not', () => {
        expect(RepsRangeVO.parse('5').isSingle).toBe(true)
        expect(RepsRangeVO.parse('5-8').isSingle).toBe(false)
    })

    it('is equal to another range with the same bounds', () => {
        expect(RepsRangeVO.parse('5-8').equals(RepsRangeVO.create(5, 8))).toBe(true)
        expect(RepsRangeVO.parse('5-8').equals(RepsRangeVO.create(5, 9))).toBe(false)
    })

    it('rejects a range written backwards', () => {
        expect(() => RepsRangeVO.create(8, 5)).toThrow(ReversedRangeError)
    })

    it('validates each bound with the scalar rule of its kind', () => {
        expect(() => RepsRangeVO.parse('0-8')).toThrow(InvalidRepsError)
        expect(() => RepsRangeVO.parse('5-1001')).toThrow(InvalidRepsError)
        expect(() => RepsRangeVO.parse('5.5')).toThrow(InvalidRepsError)
    })
})
