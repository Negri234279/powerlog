import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Counter, Histogram } from 'prom-client'

import type { Env } from '../../../../config/env'
import { AvatarStorage, type StoredObject } from '../../application/ports/avatar-storage.port'

/**
 * Prod avatar storage: Cloudflare R2 via its S3-compatible API. `urlFor` returns
 * the public bucket URL, so reads are served by R2 directly (not proxied here).
 * Each call is timed into `powerlog_r2_operation_duration_seconds` (labelled by
 * operation + success/failure) and uploads count bytes — the metrics are passed
 * in by the profile module's factory (this adapter isn't `@InjectMetric`-wired).
 */
@Injectable()
export class R2AvatarStorage extends AvatarStorage {
    private readonly client: S3Client
    private readonly bucket: string
    private readonly publicUrl: string

    constructor(
        config: ConfigService<Env, true>,
        private readonly opDuration: Histogram<string>,
        private readonly bytesUploaded: Counter<string>,
    ) {
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
        // Strip any trailing slash so urlFor doesn't produce a `//` in the path.
        this.publicUrl = config.get('R2_PUBLIC_URL', { infer: true }).replace(/\/+$/, '')
    }

    async save(key: string, bytes: Buffer, contentType: string): Promise<void> {
        await this.timed('put', () =>
            this.client.send(
                new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: contentType }),
            ),
        )
        this.bytesUploaded.inc(bytes.length)
    }

    async read(key: string): Promise<StoredObject | null> {
        try {
            return await this.timed('get', async () => {
                const out = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
                if (!out.Body) return null
                const bytes = Buffer.from(await out.Body.transformToByteArray())
                return { bytes, contentType: out.ContentType ?? 'image/webp' }
            })
        } catch {
            return null
        }
    }

    async delete(key: string): Promise<void> {
        await this.timed('delete', () => this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key })))
    }

    urlFor(key: string): string {
        // Path-style public access: R2_PUBLIC_URL is the public domain/endpoint
        // (not a bucket-bound custom domain), so the bucket is a path segment —
        // objects live at <publicUrl>/<bucket>/<key>.
        return `${this.publicUrl}/${this.bucket}/${key}`
    }

    /**
     * Liveness via `HeadObject` on a sentinel key — NOT `HeadBucket`: R2 tokens
     * scoped to "Object Read & Write" (what the app uses) can do object ops but
     * are denied bucket-level `HeadBucket`, which would falsely report DOWN. A
     * 404 here means the bucket answered and the credentials are valid (the probe
     * object just doesn't exist) → healthy. Anything else (403 auth, network,
     * missing bucket) is a real failure. Raw send so it skips the op histogram.
     */
    async ping(): Promise<void> {
        try {
            await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: '.healthcheck' }))
        } catch (error) {
            const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode
            if ((error as { name?: string }).name === 'NotFound' || status === 404) return
            throw error
        }
    }

    /** Times an R2 call, tagging the sample success/failure (re-throws on error). */
    private async timed<T>(operation: string, fn: () => Promise<T>): Promise<T> {
        const end = this.opDuration.startTimer({ operation })
        try {
            const result = await fn()
            end({ status: 'success' })
            return result
        } catch (error) {
            end({ status: 'failure' })
            throw error
        }
    }
}
