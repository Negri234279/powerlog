import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import type { Env } from '../../../../config/env'
import { AvatarStorage, type StoredObject } from '../../application/ports/avatar-storage.port'

/** Dev avatar storage: writes WebP files to a local directory, served by the API. */
@Injectable()
export class FilesystemAvatarStorage extends AvatarStorage {
    private readonly dir: string
    private readonly baseUrl: string

    constructor(config: ConfigService<Env, true>) {
        super()
        this.dir = config.get('AVATAR_DIR', { infer: true })
        this.baseUrl = config.get('AVATAR_PUBLIC_BASE_URL', { infer: true })
    }

    async save(key: string, bytes: Buffer): Promise<void> {
        await mkdir(this.dir, { recursive: true })
        await writeFile(this.pathFor(key), bytes)
    }

    async read(key: string): Promise<StoredObject | null> {
        try {
            return { bytes: await readFile(this.pathFor(key)), contentType: 'image/webp' }
        } catch {
            return null
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await unlink(this.pathFor(key))
        } catch {
            // Already gone — fine.
        }
    }

    urlFor(key: string): string {
        return `${this.baseUrl}/${key}`
    }

    /** Keys are app-generated (`<uuid>.webp`); `basename` defends against traversal. */
    private pathFor(key: string): string {
        return join(this.dir, basename(key))
    }
}
