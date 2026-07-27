import { beforeEach, describe, expect, it } from 'vitest'

import { InMemoryOnlineRegistry } from './in-memory-online-registry'

describe('InMemoryOnlineRegistry', () => {
    let registry: InMemoryOnlineRegistry

    beforeEach(() => {
        registry = new InMemoryOnlineRegistry()
    })

    it('reports the first connection and marks the user online', async () => {
        const { firstConnection } = await registry.connect('u-1')

        expect(firstConnection).toBe(true)
        expect(await registry.isOnline('u-1')).toBe(true)
    })

    it('does not report a first connection for a second socket of the same user', async () => {
        await registry.connect('u-1')
        const { firstConnection } = await registry.connect('u-1')

        expect(firstConnection).toBe(false)
    })

    it('reports the last disconnection only when the ref-count hits zero', async () => {
        await registry.connect('u-1')
        await registry.connect('u-1')

        expect((await registry.disconnect('u-1')).lastDisconnection).toBe(false)
        expect(await registry.isOnline('u-1')).toBe(true)

        expect((await registry.disconnect('u-1')).lastDisconnection).toBe(true)
        expect(await registry.isOnline('u-1')).toBe(false)
    })

    it('never goes negative when disconnect outnumbers connect', async () => {
        const { lastDisconnection } = await registry.disconnect('ghost')

        expect(lastDisconnection).toBe(true)
        expect(await registry.isOnline('ghost')).toBe(false)
    })

    it('returns the online subset among a set of users', async () => {
        await registry.connect('a')
        await registry.connect('c')

        expect(await registry.onlineAmong(['a', 'b', 'c'])).toEqual(new Set(['a', 'c']))
    })
})
