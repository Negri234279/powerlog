/** Forget the user's key for a provider, along with the rest of its config. */
export class DeleteAiProviderKeyCommand {
    constructor(
        public readonly userId: string,
        public readonly provider: string,
    ) {}
}
