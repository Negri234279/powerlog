export interface StoredObject {
    bytes: Buffer
    contentType: string
}

/**
 * Object storage for avatars. Implemented by a filesystem adapter (dev) and a
 * Cloudflare R2 adapter (prod, via the S3-compatible API). Keys are app-
 * generated (`<userId>.webp`). `urlFor` returns the public URL to serve the key.
 */
export abstract class AvatarStorage {
    abstract save(key: string, bytes: Buffer, contentType: string): Promise<void>
    abstract read(key: string): Promise<StoredObject | null>
    abstract delete(key: string): Promise<void>
    abstract urlFor(key: string): string

    /** Liveness probe: resolves if the backend is reachable, throws otherwise.
     *  Used by the periodic health probe (R2 HeadBucket / filesystem dir check). */
    abstract ping(): Promise<void>
}
