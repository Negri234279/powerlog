import { describe, expect, it } from 'vitest'

import { normalizeModelLabel } from './known-models'

describe('normalizeModelLabel', () => {
    it('keeps a known model id unchanged', () => {
        expect(normalizeModelLabel('claude-opus-4-8')).toBe('claude-opus-4-8')
        expect(normalizeModelLabel('gpt-5')).toBe('gpt-5')
    })

    it('folds a date-suffixed id onto the known id it extends', () => {
        expect(normalizeModelLabel('claude-opus-4-8-20260528')).toBe('claude-opus-4-8')
    })

    it('prefers the longest matching known id', () => {
        // Both 'gpt-5' and 'gpt-5-mini' are prefixes; the more specific one wins.
        expect(normalizeModelLabel('gpt-5-mini-2026')).toBe('gpt-5-mini')
    })

    it('collapses an unknown id to other', () => {
        expect(normalizeModelLabel('some-model-nobody-priced')).toBe('other')
        expect(normalizeModelLabel('')).toBe('other')
    })
})
