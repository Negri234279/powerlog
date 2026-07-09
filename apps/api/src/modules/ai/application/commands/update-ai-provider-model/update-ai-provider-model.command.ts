/** Select the model to use for a provider the user has already configured. */
export class UpdateAiProviderModelCommand {
    constructor(
        public readonly userId: string,
        public readonly provider: string,
        /** `null` clears the selection. */
        public readonly model: string | null,
    ) {}
}
