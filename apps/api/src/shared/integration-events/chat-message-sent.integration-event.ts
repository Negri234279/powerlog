/**
 * Published on the CQRS EventBus when a chat message is persisted. Lives in the
 * shared kernel so the transversal push module can react to it without importing
 * the chat module — the same spirit as the other integration events.
 *
 * It carries both participant ids plus the sender, so a consumer can derive the
 * recipient (the non-sender) and build a deep link to the right side of the
 * conversation. `preview` is a short, already-trimmed slice of the body for the
 * notification text — the recipient opted into seeing their own messages, so this
 * is not PII leakage the way it would be on the browser SSE stream.
 */
export class ChatMessageSentIntegrationEvent {
    constructor(
        public readonly conversationId: string,
        public readonly coachId: string,
        public readonly athleteId: string,
        public readonly senderId: string,
        public readonly preview: string,
    ) {}
}
