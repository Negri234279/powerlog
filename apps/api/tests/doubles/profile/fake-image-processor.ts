import { ImageProcessor } from '../../../src/modules/profile/application/ports/image-processor.port'

/** Returns a fixed marker buffer instead of running sharp. */
export class FakeImageProcessor extends ImageProcessor {
    async toAvatarWebp(_input: Buffer): Promise<Buffer> {
        return Buffer.from('fake-webp')
    }
}
