import { Injectable } from '@nestjs/common'
import sharp from 'sharp'

import { ImageProcessor } from '../../application/ports/image-processor.port'

const SIZE = 256
const QUALITY = 80

/**
 * Normalizes avatars to a 256×256 WebP. `rotate()` first honours EXIF
 * orientation; `fit: cover` crops to a centered square.
 */
@Injectable()
export class SharpImageProcessor extends ImageProcessor {
    async toAvatarWebp(input: Buffer): Promise<Buffer> {
        return sharp(input).rotate().resize(SIZE, SIZE, { fit: 'cover' }).webp({ quality: QUALITY }).toBuffer()
    }
}
