import { Injectable } from '@nestjs/common'

/** A presence transition to push to interested clients. */
export interface PresenceUpdate {
    userId: string
    online: boolean
    /** Set when going offline; null while online. */
    lastSeenAt: Date | null
}

/**
 * Pushes a presence transition to the sockets of specific users — never a global
 * broadcast. The presence module stays transport-agnostic behind this port (same
 * spirit as chat's `ChatPusher`); Chat.2b binds it to the Socket.IO gateway,
 * which fans out cross-instance via the Redis adapter's rooms.
 */
export abstract class PresenceBroadcaster {
    abstract emit(recipientIds: string[], update: PresenceUpdate): Promise<void>
}

/**
 * No-op broadcaster for Chat.2a — there's no gateway yet, so transitions go
 * nowhere. Chat.2b replaces this binding; `PresenceService` doesn't change.
 */
@Injectable()
export class NullPresenceBroadcaster extends PresenceBroadcaster {
    async emit(): Promise<void> {
        // Intentionally does nothing until Chat.2b wires the gateway.
    }
}
