/** Where a generation of the caller's got to. Polled while it is in flight. */
export class GetAiGenerationQuery {
    constructor(
        public readonly userId: string,
        public readonly generationId: string,
    ) {}
}
