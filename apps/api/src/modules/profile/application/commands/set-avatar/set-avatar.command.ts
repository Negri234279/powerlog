/** Set the user's avatar from a raw uploaded image (processed to WebP). */
export class SetAvatarCommand {
    constructor(
        public readonly userId: string,
        public readonly file: Buffer,
    ) {}
}
