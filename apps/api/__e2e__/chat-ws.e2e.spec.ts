import type { AddressInfo } from 'node:net'

import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import cookieParser from 'cookie-parser'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import request from 'supertest'
import { io, type Socket } from 'socket.io-client'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { AppModule } from '../src/app.module'
import { PG_POOL } from '../src/database/database.module'
import * as schema from '../src/database/schema'
import { WsIoAdapter } from '../src/gateway/ws-io-adapter'
import { Mailer } from '../src/mail/mailer.port'
import { REDIS } from '../src/redis/redis.module'
import { FakeMailer } from '../tests/doubles/shared'

let container: StartedPostgreSqlContainer
let app: INestApplication
let pool: Pool
let httpServer: ReturnType<INestApplication['getHttpServer']>
let wsUrl: string

const COOKIE = { access: 'pl_at' }
const clients: Socket[] = []

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    const testPool = new Pool({ connectionString: container.getConnectionUri() })
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
        .overrideProvider(PG_POOL)
        .useValue(testPool)
        .overrideProvider(Mailer)
        .useValue(new FakeMailer())
        .compile()

    app = moduleRef.createNestApplication({ bufferLogs: true })
    app.use(cookieParser())

    // Same adapter as prod: REDIS is null here → the in-memory Socket.IO adapter.
    const wsAdapter = new WsIoAdapter(app, app.get(REDIS), 'http://localhost:3000')
    await wsAdapter.connectToRedis()
    app.useWebSocketAdapter(wsAdapter)

    await app.listen(0)
    pool = app.get<Pool>(PG_POOL)
    await migrate(drizzle(pool, { schema }), { migrationsFolder: './drizzle' })
    httpServer = app.getHttpServer()
    const { port } = httpServer.address() as AddressInfo
    wsUrl = `http://127.0.0.1:${port}`
}, 180_000)

afterAll(async () => {
    await app?.close()
    await container?.stop()
})

beforeEach(async () => {
    await pool.query(
        'TRUNCATE TABLE users, profiles, coach_athlete_invitations, coach_athlete, coach_athlete_notes, notifications, chat_conversations, chat_messages, chat_participant_state, user_presence RESTART IDENTITY CASCADE',
    )
})

afterEach(() => {
    while (clients.length) clients.pop()?.disconnect()
})

// ── HTTP helpers (reuse GraphQL to set up the link) ─────────────────────
function setCookies(res: request.Response): string[] {
    const raw = res.headers['set-cookie']
    return Array.isArray(raw) ? raw : raw ? [raw] : []
}

function cookiePair(cookies: string[], name: string): string | undefined {
    return cookies.find((c) => c.startsWith(`${name}=`))?.split(';')[0]
}

function gql(query: string, cookie?: string) {
    const req = request(httpServer).post('/graphql').send({ query })
    return cookie ? req.set('Cookie', cookie) : req
}

async function register(email: string): Promise<{ access: string; userId: string }> {
    const username = email.split('@')[0]!.padEnd(3, '0')
    const res = await gql(
        `mutation { register(input: { email: "${email}", username: "${username}", password: "supersecret" }) { id } }`,
    )
    expect(res.body.errors).toBeUndefined()
    return { access: cookiePair(setCookies(res), COOKIE.access)!, userId: res.body.data.register.id }
}

async function eventually<T>(run: () => Promise<T>, ok: (v: T) => boolean): Promise<T> {
    for (let i = 0; i < 40; i++) {
        const value = await run()
        if (ok(value)) return value
        await new Promise((r) => setTimeout(r, 25))
    }
    throw new Error('condition not met in time')
}

async function linkedPair(): Promise<{
    coach: { access: string; userId: string }
    athlete: { access: string; userId: string }
    conversationId: string
}> {
    const coach = await register('coach@example.com')
    const athlete = await register('athlete@example.com')
    const promoted = await gql(`mutation { becomeCoach { role } }`, coach.access)
    const coachAccess = cookiePair(setCookies(promoted), COOKIE.access)!
    const invited = await gql(`mutation { inviteAthlete(email: "athlete@example.com") { id } }`, coachAccess)
    await gql(`mutation { acceptInvitation(id: "${invited.body.data.inviteAthlete.id}") { status } }`, athlete.access)

    const conversations = await eventually(
        async () =>
            (await gql(`query { listChatConversations { conversationId } }`, athlete.access)).body.data
                .listChatConversations as { conversationId: string }[],
        (list) => list.length >= 1,
    )
    return {
        coach: { access: coachAccess, userId: coach.userId },
        athlete: { access: athlete.access, userId: athlete.userId },
        conversationId: conversations[0]!.conversationId,
    }
}

// ── WS helpers ──────────────────────────────────────────────────────────
function connect(cookie?: string): Socket {
    const socket = io(wsUrl, {
        path: '/ws',
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
        ...(cookie ? { extraHeaders: { cookie } } : {}),
    })
    clients.push(socket)
    return socket
}

function waitConnect(socket: Socket): Promise<void> {
    return new Promise((resolve, reject) => {
        socket.once('connect', () => resolve())
        socket.once('connect_error', reject)
    })
}

function once<T = unknown>(socket: Socket, event: string, timeoutMs = 5_000): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`no "${event}" arrived in time`)), timeoutMs)
        socket.once(event, (payload: T) => {
            clearTimeout(timer)
            resolve(payload)
        })
    })
}

function emitAck<T = unknown>(socket: Socket, event: string, payload: unknown, timeoutMs = 5_000): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`no ack for "${event}"`)), timeoutMs)
        socket.emit(event, payload, (ack: T) => {
            clearTimeout(timer)
            resolve(ack)
        })
    })
}

describe('Chat gateway (WebSocket)', () => {
    it('rejects a handshake without a valid auth cookie', async () => {
        const socket = connect()

        const reason = await new Promise<string>((resolve, reject) => {
            socket.on('disconnect', (r) => resolve(r))
            socket.on('connect_error', () => resolve('connect_error'))
            setTimeout(() => reject(new Error('the socket stayed connected')), 3_000)
        })

        expect(reason).toBeTruthy()
    })

    it('accepts an authenticated handshake', async () => {
        const { coach } = await linkedPair()
        const socket = connect(coach.access)

        await expect(waitConnect(socket)).resolves.toBeUndefined()
        expect(socket.connected).toBe(true)
    })

    it('rejects joining a conversation the user is not part of', async () => {
        const { conversationId } = await linkedPair()
        const stranger = await register('stranger@example.com')
        const socket = connect(stranger.access)
        await waitConnect(socket)

        const ack = await emitAck<{ ok: boolean; code?: string }>(socket, 'chat:join', { conversationId })

        expect(ack.ok).toBe(false)
        expect(ack.code).toBe('NOT_YOUR_CONVERSATION')
    })

    it('delivers a sent message to the other participant live', async () => {
        const { coach, athlete, conversationId } = await linkedPair()
        const coachSocket = connect(coach.access)
        const athleteSocket = connect(athlete.access)
        await Promise.all([waitConnect(coachSocket), waitConnect(athleteSocket)])

        const received = once<{ conversationId: string; body: string; senderId: string }>(athleteSocket, 'chat:message')
        const ack = await emitAck<{ ok: boolean; message?: { body: string } }>(coachSocket, 'chat:send', {
            conversationId,
            body: 'hola en vivo',
        })

        expect(ack.ok).toBe(true)
        expect(ack.message?.body).toBe('hola en vivo')

        const message = await received
        expect(message).toMatchObject({ conversationId, body: 'hola en vivo', senderId: coach.userId })
    })

    it('pushes a presence update to a counterparty when the user comes online', async () => {
        const { coach, athlete } = await linkedPair()
        const coachSocket = connect(coach.access)
        await waitConnect(coachSocket)

        // The coach is online and watching; the athlete connects…
        const update = once<{ userId: string; online: boolean }>(coachSocket, 'presence:update')
        const athleteSocket = connect(athlete.access)
        await waitConnect(athleteSocket)

        // …and the coach learns the athlete is online.
        expect(await update).toMatchObject({ userId: athlete.userId, online: true })
    })
})
