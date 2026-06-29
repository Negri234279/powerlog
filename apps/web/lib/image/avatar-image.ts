/**
 * Client-side avatar validation + downscale, run before upload. Mirrors the
 * API's accepted types and size cap, and re-encodes to a smaller WebP so we send
 * far fewer bytes (the server still center-crops to a 256² WebP). EXIF
 * orientation is baked in via `createImageBitmap`, so the re-encoded pixels are
 * already upright.
 */

export const ACCEPTED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024

const TARGET_MAX_DIM = 512
const WEBP_QUALITY = 0.9

/** Human-readable error if the file is unacceptable, else null. */
export function validateAvatarFile(file: File): string | null {
    if (!ACCEPTED_AVATAR_TYPES.includes(file.type as (typeof ACCEPTED_AVATAR_TYPES)[number])) {
        return 'Unsupported image type. Use JPEG, PNG or WebP.'
    }
    if (file.size > MAX_AVATAR_BYTES) {
        return 'Image is too large (max 5 MB).'
    }
    return null
}

export interface PreparedAvatar {
    /** The bytes to upload (downscaled WebP, or the original on fallback). */
    blob: Blob
    /** Object URL for preview — the caller must revoke it when done. */
    previewUrl: string
}

/**
 * Validates, downscales (longest side ≤ 512px) and re-encodes to WebP in a
 * canvas. On any unsupported-browser or decode failure it falls back to the
 * original file (the server validates + normalises too), so upload still works.
 */
export async function prepareAvatar(file: File): Promise<PreparedAvatar> {
    const fallback = (): PreparedAvatar => ({ blob: file, previewUrl: URL.createObjectURL(file) })

    if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') {
        return fallback()
    }

    let bitmap: ImageBitmap
    try {
        bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
        return fallback()
    }

    try {
        const scale = Math.min(1, TARGET_MAX_DIM / Math.max(bitmap.width, bitmap.height))
        const width = Math.max(1, Math.round(bitmap.width * scale))
        const height = Math.max(1, Math.round(bitmap.height * scale))

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) return fallback()
        ctx.drawImage(bitmap, 0, 0, width, height)

        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY))
        if (!blob) return fallback()

        return { blob, previewUrl: URL.createObjectURL(blob) }
    } finally {
        bitmap.close()
    }
}
