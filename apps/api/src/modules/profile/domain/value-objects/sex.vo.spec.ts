import { describe, expect, it } from 'vitest'

import { InvalidSexError } from '../errors/profile.errors'
import { SexVO } from './sex.vo'

describe('SexVO', () => {
    it('accepts male and female', () => {
        expect(SexVO.create('male').value).toBe('male')
        expect(SexVO.create('female').value).toBe('female')
    })

    it('rejects anything else', () => {
        expect(() => SexVO.create('other')).toThrow(InvalidSexError)
    })
})
