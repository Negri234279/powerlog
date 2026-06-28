import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { SharpImageProcessor } from './sharp-image-processor'

describe('SharpImageProcessor', () => {
    it('normalizes any image to a 256x256 WebP', async () => {
        // A non-square PNG to prove it gets cropped/resized to a square WebP.
        const input = await sharp({
            create: { width: 100, height: 40, channels: 3, background: { r: 200, g: 30, b: 30 } },
        })
            .png()
            .toBuffer()

        const out = await new SharpImageProcessor().toAvatarWebp(input)

        const meta = await sharp(out).metadata()
        expect(meta.format).toBe('webp')
        expect(meta.width).toBe(256)
        expect(meta.height).toBe(256)
    })
})
