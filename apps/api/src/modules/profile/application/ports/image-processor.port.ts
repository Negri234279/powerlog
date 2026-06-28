/**
 * Normalizes user-supplied images into a canonical avatar (square, optimized
 * WebP). Implemented in infrastructure (sharp). Keeps every avatar one size.
 */
export abstract class ImageProcessor {
    abstract toAvatarWebp(input: Buffer): Promise<Buffer>
}
