import { type BeforeApplicationShutdown, Injectable, type OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import {
    ConnectedSocket,
    MessageBody,
    type OnGatewayConnection,
    type OnGatewayDisconnect,
    type OnGatewayInit,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets'
import { InjectMetric } from '@willsoto/nestjs-prometheus'
import { trace } from '@opentelemetry/api'
import { PinoLogger } from 'nestjs-pino'
import type { Gauge } from 'prom-client'
import type { Server, Socket } from 'socket.io'

import type { Env } from '../config/env'
import { METRIC } from '../observability/metrics'
import { TokenSigner } from '../modules/auth/application/ports/token-signer.port'
import { MarkConversationDeliveredCommand } from '../modules/chat/application/commands/mark-conversation-delivered/mark-conversation-delivered.command'
import { MarkConversationReadCommand } from '../modules/chat/application/commands/mark-conversation-read/mark-conversation-read.command'
import { SendChatMessageCommand } from '../modules/chat/application/commands/send-chat-message/send-chat-message.command'
import type { ChatPusher } from '../modules/chat/application/ports/chat-pusher.port'
import { GetConversationParticipantsQuery } from '../modules/chat/application/queries/get-conversation-participants/get-conversation-participants.query'
import type { MessageEntity } from '../modules/chat/domain/entities/message.entity'
import { SettableChatPusher } from '../modules/chat/infrastructure/push/settable-chat-pusher'
import type { PresenceBroadcaster, PresenceUpdate } from '../presence/presence-broadcaster'
import { PresenceService } from '../presence/presence.service'
import { SettablePresenceBroadcaster } from '../presence/settable-presence-broadcaster'
import { readCookie } from './ws-cookie'
import { cursorAckPayloadSchema, joinPayloadSchema, sendPayloadSchema, typingPayloadSchema } from './ws-payloads'

/** Acknowledgement returned to the client's callback for a command-ish event. */
type Ack = { ok: true } | { ok: false; code: string }
type SendAck = { ok: true; message: SerializedMessage } | { ok: false; code: string }

interface SerializedMessage {
    id: string
    conversationId: string
    senderId: string
    kind: string
    body: string
    createdAt: string
}

const tracer = trace.getTracer('chat-ws')

/**
 * The single realtime socket: presence lifecycle + live chat, on the same
 * connection every authenticated tab already opens. Writes never touch the DB
 * here — each state-changing event dispatches the SAME command as GraphQL
 * (`chat:send` → `SendChatMessageCommand`), so business logic isn't duplicated,
 * only the entry point. Message/cursor/presence events are emitted to each
 * recipient's own `user:<id>` room (joined + authorized at handshake, so carrying
 * the body is safe and every tab + the inbox update at once); ephemeral typing
 * uses the per-conversation room a socket `chat:join`s after authorization.
 *
 * It IS the `ChatPusher` and `PresenceBroadcaster` — registered as their delegate
 * on init, which is how the chat command and the presence service reach the wire
 * without importing the transport.
 */
@Injectable()
@WebSocketGateway()
export class ChatGateway
    implements
        OnGatewayInit,
        OnGatewayConnection,
        OnGatewayDisconnect,
        OnModuleInit,
        BeforeApplicationShutdown,
        ChatPusher,
        PresenceBroadcaster
{
    @WebSocketServer() private server!: Server

    private readonly cookieName: string
    private heartbeat?: NodeJS.Timeout

    constructor(
        private readonly commandBus: CommandBus,
        private readonly queryBus: QueryBus,
        private readonly presence: PresenceService,
        private readonly chatPusher: SettableChatPusher,
        private readonly presenceBroadcaster: SettablePresenceBroadcaster,
        private readonly tokenSigner: TokenSigner,
        config: ConfigService<Env, true>,
        private readonly logger: PinoLogger,
        @InjectMetric(METRIC.chatWsConnections) private readonly connections: Gauge<string>,
    ) {
        this.cookieName = config.get('AUTH_COOKIE_NAME', { infer: true })
        this.logger.setContext(ChatGateway.name)
    }

    onModuleInit(): void {
        // Register as the live delegate for both ports (see class doc).
        this.chatPusher.setDelegate(this)
        this.presenceBroadcaster.setDelegate(this)
    }

    afterInit(): void {
        // Keep still-connected users' presence TTL fresh (Redis registry expires
        // it so a crashed process can't pin someone online forever).
        this.heartbeat = setInterval(() => void this.refreshPresence(), 30_000)
        this.heartbeat.unref?.()
    }

    async beforeApplicationShutdown(): Promise<void> {
        if (this.heartbeat) clearInterval(this.heartbeat)
        // WS connections are long-lived; without this the HTTP drain in main.ts
        // would wait on them until the watchdog kills the process with exit 1.
        this.server?.disconnectSockets(true)
    }

    async handleConnection(client: Socket): Promise<void> {
        const userId = await this.authenticate(client)
        if (!userId) {
            client.disconnect(true)
            return
        }

        client.data.userId = userId
        this.connections.inc()

        await client.join(this.userRoom(userId))
        await this.presence.onConnect(userId)

        this.logger.debug({ userId }, 'ws connected')
    }

    async handleDisconnect(client: Socket): Promise<void> {
        const userId = client.data.userId as string | undefined
        if (!userId) return

        this.connections.dec()

        await this.presence.onDisconnect(userId)
        this.logger.debug({ userId }, 'ws disconnected')
    }

    @SubscribeMessage('chat:join')
    async onJoin(@ConnectedSocket() client: Socket, @MessageBody() raw: unknown): Promise<Ack> {
        const parsed = joinPayloadSchema.safeParse(raw)
        if (!parsed.success) {
            return {
                ok: false,
                code: 'BAD_REQUEST',
            }
        }

        try {
            const query = new GetConversationParticipantsQuery(this.userId(client), parsed.data.conversationId)

            await this.queryBus.execute(query)
            await client.join(this.conversationRoom(parsed.data.conversationId))

            return {
                ok: true,
            }
        } catch (err) {
            return {
                ok: false,
                code: this.errorCode(err),
            }
        }
    }

    @SubscribeMessage('chat:leave')
    async onLeave(@ConnectedSocket() client: Socket, @MessageBody() raw: unknown): Promise<Ack> {
        const parsed = joinPayloadSchema.safeParse(raw)
        if (!parsed.success)
            return {
                ok: false,
                code: 'BAD_REQUEST',
            }

        await client.leave(this.conversationRoom(parsed.data.conversationId))

        return {
            ok: true,
        }
    }

    @SubscribeMessage('chat:typing')
    onTyping(@ConnectedSocket() client: Socket, @MessageBody() raw: unknown): void {
        const parsed = typingPayloadSchema.safeParse(raw)
        if (!parsed.success) return

        // Ephemeral, never persisted — relayed to the conversation room only.
        client
            .to(this.conversationRoom(parsed.data.conversationId))
            .emit('chat:typing', { conversationId: parsed.data.conversationId, userId: this.userId(client) })
    }

    @SubscribeMessage('chat:send')
    async onSend(@ConnectedSocket() client: Socket, @MessageBody() raw: unknown): Promise<SendAck> {
        const parsed = sendPayloadSchema.safeParse(raw)
        if (!parsed.success) return { ok: false, code: 'BAD_REQUEST' }

        // The command's CQRS span would be orphaned (OTel doesn't instrument
        // Socket.IO); parent it under a manual span so a send is traceable.
        return tracer.startActiveSpan('chat.ws chat:send', async (span): Promise<SendAck> => {
            try {
                const command = new SendChatMessageCommand(
                    this.userId(client),
                    parsed.data.conversationId,
                    parsed.data.body,
                )
                const message = await this.commandBus.execute<SendChatMessageCommand, MessageEntity>(command)

                return {
                    ok: true,
                    message: this.serialize(message),
                }
            } catch (err) {
                return {
                    ok: false,
                    code: this.errorCode(err),
                }
            } finally {
                span.end()
            }
        })
    }

    @SubscribeMessage('chat:read-ack')
    async onReadAck(@ConnectedSocket() client: Socket, @MessageBody() raw: unknown): Promise<Ack> {
        const parsed = cursorAckPayloadSchema.safeParse(raw)
        if (!parsed.success) return { ok: false, code: 'BAD_REQUEST' }

        try {
            const command = new MarkConversationReadCommand(this.userId(client), parsed.data.conversationId)
            await this.commandBus.execute(command)

            return {
                ok: true,
            }
        } catch (err) {
            return { ok: false, code: this.errorCode(err) }
        }
    }

    @SubscribeMessage('chat:delivered-ack')
    async onDeliveredAck(@ConnectedSocket() client: Socket, @MessageBody() raw: unknown): Promise<Ack> {
        const parsed = cursorAckPayloadSchema.safeParse(raw)
        if (!parsed.success) return { ok: false, code: 'BAD_REQUEST' }

        try {
            const command = new MarkConversationDeliveredCommand(this.userId(client), parsed.data.conversationId)
            await this.commandBus.execute(command)

            return {
                ok: true,
            }
        } catch (err) {
            return {
                ok: false,
                code: this.errorCode(err),
            }
        }
    }

    // ── ChatPusher (delegate) ────────────────────────────────────────────
    // Best-effort: the port must never throw into the command path, so a not-yet-
    // initialised server (e.g. an HTTP-only test app) simply skips the live push.
    async messagePosted(input: Parameters<ChatPusher['messagePosted']>[0]): Promise<void> {
        if (!this.server) return

        const payload = this.serialize(input.message)

        for (const id of input.recipientIds) {
            this.server.to(this.userRoom(id)).emit('chat:message', payload)
        }
    }

    async cursorAdvanced(input: Parameters<ChatPusher['cursorAdvanced']>[0]): Promise<void> {
        if (!this.server) return

        const event = input.kind === 'read' ? 'chat:read' : 'chat:delivered'
        const payload = { conversationId: input.conversationId, userId: input.userId, messageId: input.messageId }

        for (const id of input.recipientIds) {
            this.server.to(this.userRoom(id)).emit(event, payload)
        }
    }

    // ── PresenceBroadcaster (delegate) ───────────────────────────────────
    async emit(recipientIds: string[], update: PresenceUpdate): Promise<void> {
        if (!this.server) return

        const payload = {
            userId: update.userId,
            online: update.online,
            lastSeenAt: update.lastSeenAt?.toISOString() ?? null,
        }

        for (const id of recipientIds) {
            this.server.to(this.userRoom(id)).emit('presence:update', payload)
        }
    }

    private async authenticate(client: Socket): Promise<string | null> {
        const token = readCookie(client.handshake.headers.cookie, this.cookieName)
        if (!token) return null

        try {
            const claims = await this.tokenSigner.verifyAccessToken(token)
            return claims.userId
        } catch {
            return null
        }
    }

    private async refreshPresence(): Promise<void> {
        const userIds = new Set<string>()

        for (const [, socket] of this.server.sockets.sockets) {
            const userId = socket.data.userId as string | undefined
            if (userId) {
                userIds.add(userId)
            }
        }

        await Promise.all([...userIds].map((id) => this.presence.refresh(id)))
    }

    private userId(client: Socket): string {
        return client.data.userId as string
    }

    private userRoom(userId: string): string {
        return `user:${userId}`
    }

    private conversationRoom(conversationId: string): string {
        return `conversation:${conversationId}`
    }

    private serialize(message: MessageEntity): SerializedMessage {
        return {
            id: message.id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            kind: message.kind,
            body: message.body,
            createdAt: message.createdAt.toISOString(),
        }
    }

    private errorCode(err: unknown): string {
        if (err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string') {
            return (err as { code: string }).code
        }

        this.logger.error({ err }, 'unexpected ws error')

        return 'INTERNAL'
    }
}
