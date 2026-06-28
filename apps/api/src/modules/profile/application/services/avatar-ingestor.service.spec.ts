import { afterEach, describe, expect, it, vi } from 'vitest'

import { FakeAvatarStorage, FakeImageProcessor } from '../../../../../tests/doubles/profile'
import { counterValue, testCounter } from '../../../../../tests/doubles/shared'
import { AvatarIngestor } from './avatar-ingestor.service'

function setup() {
    const storage = new FakeAvatarStorage()
    const metric = testCounter(['source', 'status'])
    const ingestor = new AvatarIngestor(new FakeImageProcessor(), storage, metric)
    return { storage, ingestor, metric }
}

describe('AvatarIngestor', () => {
    afterEach(() => vi.restoreAllMocks())

    it('processes the input and stores it under <userId>.webp', async () => {
        const { storage, ingestor, metric } = setup()

        const key = await ingestor.ingest('u-1', Buffer.from('jpeg-bytes'))

        expect(key).toBe('u-1.webp')
        expect(storage.objects.get('u-1.webp')?.bytes.toString()).toBe('fake-webp')
        expect(await counterValue(metric, { source: 'upload', status: 'success' })).toBe(1)
    })

    it('counts a failure (and rethrows) when storage fails', async () => {
        const { storage, ingestor, metric } = setup()
        vi.spyOn(storage, 'save').mockRejectedValue(new Error('disk full'))

        await expect(ingestor.ingest('u-1', Buffer.from('jpeg-bytes'))).rejects.toThrow('disk full')
        expect(await counterValue(metric, { source: 'upload', status: 'failure' })).toBe(1)
    })

    it('ingestFromUrl fetches then ingests', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(new Uint8Array([1, 2, 3]), { status: 200 }))
        const { storage, ingestor, metric } = setup()

        const key = await ingestor.ingestFromUrl('u-1', 'https://google/photo.jpg')

        expect(key).toBe('u-1.webp')
        expect(storage.objects.has('u-1.webp')).toBe(true)
        expect(await counterValue(metric, { source: 'google', status: 'success' })).toBe(1)
    })

    it('ingestFromUrl returns null on a non-ok response', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }))
        const { ingestor } = setup()

        expect(await ingestor.ingestFromUrl('u-1', 'https://google/missing.jpg')).toBeNull()
    })

    it('ingestFromUrl returns null when fetch throws', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'))
        const { ingestor } = setup()

        expect(await ingestor.ingestFromUrl('u-1', 'https://google/photo.jpg')).toBeNull()
    })
})
