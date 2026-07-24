/**
 * Published on the CQRS EventBus when an AI generation finishes, either way.
 * Lives in the shared kernel so `src/realtime` can push the news down the user's
 * SSE stream without importing the `ai` module.
 *
 * It carries no draft content on purpose — the browser refetches through
 * GraphQL, where the authorization already lives.
 */
export class AiGenerationSettledIntegrationEvent {
    constructor(
        public readonly userId: string,
        public readonly generationId: string,
        /** One of the four generation kinds. */
        public readonly kind: string,
        /** `succeeded` or `failed`. */
        public readonly status: string,
        /** The draft it produced, when it succeeded. */
        public readonly draftId: string | null,
    ) {}
}
