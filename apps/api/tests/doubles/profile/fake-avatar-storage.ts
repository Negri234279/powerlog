import { AvatarStorage, type StoredObject } from '../../../src/modules/profile/application/ports/avatar-storage.port'

/** In-memory AvatarStorage; `urlFor` returns a deterministic fake CDN URL. */
export class FakeAvatarStorage extends AvatarStorage {
    readonly objects = new Map<string, StoredObject>()

    async save(key: string, bytes: Buffer, contentType: string): Promise<void> {
        this.objects.set(key, { bytes, contentType })
    }

    async read(key: string): Promise<StoredObject | null> {
        return this.objects.get(key) ?? null
    }

    async delete(key: string): Promise<void> {
        this.objects.delete(key)
    }

    urlFor(key: string): string {
        return `https://cdn.test/${key}`
    }

    async ping(): Promise<void> {
        // In-memory backend is always reachable.
    }
}
