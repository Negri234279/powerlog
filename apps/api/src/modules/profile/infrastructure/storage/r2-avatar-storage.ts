import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import type { Env } from '../../../../config/env'
import { AvatarStorage, type StoredObject } from '../../application/ports/avatar-storage.port'

/**
 * Prod avatar storage: Cloudflare R2 via its S3-compatible API. `urlFor` returns
 * the public bucket URL, so reads are served by R2 directly (not proxied here).
 */
@Injectable()
export class R2AvatarStorage extends AvatarStorage {
    private readonly client: S3Client
    private readonly bucket: string
    private readonly publicUrl: string

    constructor(config: ConfigService<Env, true>) {
        super()
        this.client = new S3Client({
            region: 'auto',
            endpoint: config.get('R2_ENDPOINT', { infer: true }),
            credentials: {
                accessKeyId: config.get('R2_ACCESS_KEY_ID', { infer: true }),
                secretAccessKey: config.get('R2_SECRET_ACCESS_KEY', { infer: true }),
            },
            forcePathStyle: true,
        })
        this.bucket = config.get('R2_BUCKET', { infer: true })
        this.publicUrl = config.get('R2_PUBLIC_URL', { infer: true })
    }

    async save(key: string, bytes: Buffer, contentType: string): Promise<void> {
        await this.client.send(
            new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: contentType }),
        )
    }

    async read(key: string): Promise<StoredObject | null> {
        try {
            const out = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
            if (!out.Body) return null
            const bytes = Buffer.from(await out.Body.transformToByteArray())
            return { bytes, contentType: out.ContentType ?? 'image/webp' }
        } catch {
            return null
        }
    }

    async delete(key: string): Promise<void> {
        await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
    }

    urlFor(key: string): string {
        return `${this.publicUrl}/${key}`
    }
}
