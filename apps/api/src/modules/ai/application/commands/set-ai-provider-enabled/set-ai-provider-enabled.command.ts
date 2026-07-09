/** Turn a configured provider on or off without discarding its stored key. */
export class SetAiProviderEnabledCommand {
    constructor(
        public readonly userId: string,
        public readonly provider: string,
        public readonly enabled: boolean,
    ) {}
}
