import { DomainError } from '../../../../shared/domain/domain-error'

/**
 * Domain errors for the chat context. Each carries a stable `code` the global
 * exception filter maps to GraphQL `extensions.code` / HTTP + the
 * `domain_errors_total` metric.
 */
export abstract class ChatError extends DomainError {}

/** The conversation id doesn't exist. */
export class ConversationNotFoundError extends ChatError {
    readonly code = 'CONVERSATION_NOT_FOUND'
    constructor() {
        super('The conversation does not exist.')
    }
}

/** The viewer is neither the coach nor the athlete of this conversation. */
export class NotYourConversationError extends ChatError {
    readonly code = 'NOT_YOUR_CONVERSATION'
    constructor() {
        super('You are not a participant of this conversation.')
    }
}

/**
 * The coach↔athlete link is broken, so the conversation is read-only. History
 * stays visible to both parties, but nobody can send until they re-link.
 */
export class ConversationReadOnlyError extends ChatError {
    readonly code = 'CONVERSATION_READ_ONLY'
    constructor() {
        super('This conversation is read-only: you are no longer linked.')
    }
}

/** The message body is empty (or whitespace only). */
export class MessageEmptyError extends ChatError {
    readonly code = 'MESSAGE_EMPTY'
    constructor() {
        super('A message cannot be empty.')
    }
}

/** The message body exceeds the maximum allowed length. */
export class MessageTooLongError extends ChatError {
    readonly code = 'MESSAGE_TOO_LONG'
    constructor(max: number) {
        super(`A message cannot exceed ${max} characters.`)
    }
}

/** The pagination cursor is malformed. */
export class InvalidChatCursorError extends ChatError {
    readonly code = 'INVALID_CHAT_CURSOR'
    constructor() {
        super('The pagination cursor is malformed.')
    }
}
