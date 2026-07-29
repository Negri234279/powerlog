import { ClearConversationHandler } from './commands/clear-conversation/clear-conversation.handler'
import { DeleteConversationHandler } from './commands/delete-conversation/delete-conversation.handler'
import { MarkConversationDeliveredHandler } from './commands/mark-conversation-delivered/mark-conversation-delivered.handler'
import { MarkConversationReadHandler } from './commands/mark-conversation-read/mark-conversation-read.handler'
import { SendChatMessageHandler } from './commands/send-chat-message/send-chat-message.handler'
import { CreateConversationOnCoachLinkEstablished } from './event-handlers/create-conversation-on-coach-link-established.handler'
import { GetConversationParticipantsHandler } from './queries/get-conversation-participants/get-conversation-participants.handler'
import { ListChatConversationsHandler } from './queries/list-chat-conversations/list-chat-conversations.handler'
import { ListChatMessagesHandler } from './queries/list-chat-messages/list-chat-messages.handler'

/** CQRS command handlers for the chat module. */
export const CHAT_COMMAND_HANDLERS = [
    SendChatMessageHandler,
    MarkConversationReadHandler,
    MarkConversationDeliveredHandler,
    ClearConversationHandler,
    DeleteConversationHandler,
]

/** CQRS query handlers for the chat module. */
export const CHAT_QUERY_HANDLERS = [
    ListChatMessagesHandler,
    ListChatConversationsHandler,
    GetConversationParticipantsHandler,
]

/** Integration-event handlers (react to events on the bus). */
export const CHAT_EVENT_HANDLERS = [CreateConversationOnCoachLinkEstablished]
