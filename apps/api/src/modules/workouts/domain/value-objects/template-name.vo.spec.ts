import { describe, expect, it } from 'vitest'

import { InvalidTemplateNameError } from '../errors/workouts.errors'
import { TemplateNameVO } from './template-name.vo'

describe('TemplateNameVO', () => {
    it('trims surrounding whitespace', () => {
        expect(TemplateNameVO.create('  Upper A  ').value).toBe('Upper A')
    })

    it('rejects an empty (or whitespace-only) name', () => {
        expect(() => TemplateNameVO.create('   ')).toThrow(InvalidTemplateNameError)
    })

    it('rejects a name longer than 100 characters', () => {
        expect(() => TemplateNameVO.create('a'.repeat(101))).toThrow(InvalidTemplateNameError)
    })

    it('accepts a 100-character name', () => {
        expect(TemplateNameVO.create('a'.repeat(100)).value).toHaveLength(100)
    })
})
