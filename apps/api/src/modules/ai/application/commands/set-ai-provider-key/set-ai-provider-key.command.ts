/**
 * Store (or replace) the user's API key for one provider. The key arrives in the
 * clear from presentation and must not be logged anywhere along the way.
 */
export class SetAiProviderKeyCommand {
    constructor(
        public readonly userId: string,
        public readonly provider: string,
        public readonly apiKey: string,
        /** Optional model to select at the same time; validated against the key. */
        public readonly model?: string | null,
    ) {}
}
