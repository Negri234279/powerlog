/**
 * Make one configured provider the user's default — the one the AI features
 * reach for when several keys are stored. Any previous default steps down.
 */
export class SetAiProviderDefaultCommand {
    constructor(
        public readonly userId: string,
        public readonly provider: string,
    ) {}
}
