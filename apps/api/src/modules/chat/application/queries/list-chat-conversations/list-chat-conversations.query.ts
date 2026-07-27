/** The caller's chat inbox: one row per conversation, most recent first. */
export class ListChatConversationsQuery {
    constructor(public readonly userId: string) {}
}
