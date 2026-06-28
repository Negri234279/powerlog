/** Remove the user's custom avatar (revert to the default). */
export class RemoveAvatarCommand {
    constructor(public readonly userId: string) {}
}
