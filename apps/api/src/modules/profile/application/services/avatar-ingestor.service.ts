import { Injectable } from '@nestjs/common'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import type { Counter } from 'prom-client'

import { METRIC } from '../../../../observability/metrics'
import { AvatarStorage } from '../ports/avatar-storage.port'
import { ImageProcessor } from '../ports/image-processor.port'

/** Where the raw image came from — the `source` label on the avatars metric. */
type AvatarSource = 'upload' | 'google'

/**
 * Turns raw image input (an upload, or a fetched Google photo) into the
 * canonical WebP avatar and stores it under a per-user key. Returns the key.
 */
@Injectable()
export class AvatarIngestor {
    constructor(
        private readonly processor: ImageProcessor,
        private readonly storage: AvatarStorage,
        @InjectMetric(METRIC.avatarsProcessed) private readonly avatarsProcessed: Counter<string>,
    ) {}

    /** Ingests a user-uploaded image. */
    async ingest(userId: string, input: Buffer): Promise<string> {
        return this.process('upload', userId, input)
    }

    /** Best-effort fetch + ingest of a remote image (e.g. the Google photo). */
    async ingestFromUrl(userId: string, url: string): Promise<string | null> {
        try {
            const response = await fetch(url)
            if (!response.ok) return null
            return await this.process('google', userId, Buffer.from(await response.arrayBuffer()))
        } catch {
            return null
        }
    }

    private async process(source: AvatarSource, userId: string, input: Buffer): Promise<string> {
        try {
            const webp = await this.processor.toAvatarWebp(input)
            const key = this.keyFor(userId)
            await this.storage.save(key, webp, 'image/webp')
            this.avatarsProcessed.inc({ source, status: 'success' })
            return key
        } catch (error) {
            this.avatarsProcessed.inc({ source, status: 'failure' })
            throw error
        }
    }

    private keyFor(userId: string): string {
        return `${userId}.webp`
    }
}
