import { describe, expect, it } from 'vitest'

import { FakeAvatarStorage, FakeProfileConfig } from '../../../../../tests/doubles/profile'
import { AvatarUrls } from './avatar-urls.service'

describe('AvatarUrls', () => {
    it('resolves a key to the storage URL', () => {
        const urls = new AvatarUrls(new FakeAvatarStorage(), new FakeProfileConfig())
        expect(urls.resolve('u-1.webp')).toBe('https://cdn.test/u-1.webp')
    })

    it('appends an updatedAt cache-buster when given one', () => {
        const urls = new AvatarUrls(new FakeAvatarStorage(), new FakeProfileConfig())
        expect(urls.resolve('u-1.webp', new Date(1_700_000_000_000))).toBe('https://cdn.test/u-1.webp?v=1700000000000')
    })

    it('returns null for no key when no default is configured', () => {
        const urls = new AvatarUrls(new FakeAvatarStorage(), new FakeProfileConfig(''))
        expect(urls.resolve(null)).toBeNull()
    })

    it('returns the configured default for no key', () => {
        const urls = new AvatarUrls(new FakeAvatarStorage(), new FakeProfileConfig('https://cdn/default.webp'))
        expect(urls.resolve(null)).toBe('https://cdn/default.webp')
    })
})
