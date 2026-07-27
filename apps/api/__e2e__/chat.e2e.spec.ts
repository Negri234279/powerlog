import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import cookieParser from 'cookie-parser'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { AppModule } from '../src/app.module'
import { PG_POOL } from '../src/database/database.module'
import * as schema from '../src/database/schema'
import { Mailer } from '../src/mail/mailer.port'
import { FakeMailer } from '../tests/doubles/shared'

let container: StartedPostgreSqlContainer
let app: INestApplication
let pool: Pool
let httpServer: ReturnType<INestApplication['getHttpServer']>
let mailer: FakeMailer

const COOKIE = { access: 'pl_at' }

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
    await app.init()

    pool = app.get<Pool>(PG_POOL)
    await migrate(drizzle(pool, { schema }), { migrationsFolder: './drizzle' })
    httpServer = app.getHttpServer()
    mailer = app.get<FakeMailer>(Mailer)
}, 180_000)

afterAll(async () => {
    await app?.close()
    await container?.stop()
})

beforeEach(async () => {
    await pool.query(
        'TRUNCATE TABLE users, profiles, coach_athlete_invitations, coach_athlete, coach_athlete_notes, notifications, chat_conversations, chat_messages, chat_participant_state RESTART IDENTITY CASCADE',
    )
    mailer.sent.length = 0
})

// ── helpers ───────────────────────────────────────────────────────────
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

function usernameFor(email: string): string {
    return email
        .split('@')[0]!
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .padEnd(3, '0')
}

async function register(email: string): Promise<{ access: string; username: string; userId: string }> {
    const username = usernameFor(email)
    const res = await gql(
        `mutation { register(input: { email: "${email}", username: "${username}", password: "supersecret" }) { id } }`,
    )
    expect(res.body.errors).toBeUndefined()
    return { access: cookiePair(setCookies(res), COOKIE.access)!, username, userId: res.body.data.register.id }
}

async function eventually<T>(run: () => Promise<T>, predicate: (value: T) => boolean): Promise<T> {
    for (let i = 0; i < 40; i++) {
        const value = await run()
        if (predicate(value)) return value
        await new Promise((r) => setTimeout(r, 25))
    }
    throw new Error('condition not met in time')
}

/** Register coach + athlete, link them, and return the conversation id. */
async function linkAndConversation(): Promise<{
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

    // The link fires CoachLinkEstablished → the chat handler creates the conversation (async).
    const conversations = await eventually(
        async () =>
            (await gql(`query { listChatConversations { conversationId otherParticipantId } }`, athlete.access)).body
                .data.listChatConversations as { conversationId: string; otherParticipantId: string }[],
        (list) => list.length >= 1,
    )
    expect(conversations[0]!.otherParticipantId).toBe(coach.userId)

    return {
        coach: { access: coachAccess, userId: coach.userId },
        athlete: { access: athlete.access, userId: athlete.userId },
        conversationId: conversations[0]!.conversationId,
    }
}

describe('Chat via GraphQL', () => {
    it('creates a conversation on link and delivers a message both ways', async () => {
        const { coach, athlete, conversationId } = await linkAndConversation()

        const sent = await gql(
            `mutation { sendChatMessage(conversationId: "${conversationId}", body: "  hola atleta  ") { id body senderId status } }`,
            coach.access,
        )
        expect(sent.body.errors).toBeUndefined()
        expect(sent.body.data.sendChatMessage.body).toBe('hola atleta')
        expect(sent.body.data.sendChatMessage.status).toBe('sent')

        // The athlete reads the history.
        const history = await gql(
            `query { listChatMessages(conversationId: "${conversationId}") { items { body senderId } hasNextPage } }`,
            athlete.access,
        )
        expect(history.body.data.listChatMessages.items).toEqual([{ body: 'hola atleta', senderId: coach.userId }])

        // The athlete's inbox shows one unread from the coach.
        const inbox = await gql(`query { listChatConversations { unreadCount lastMessage { body } } }`, athlete.access)
        expect(inbox.body.data.listChatConversations[0]).toMatchObject({
            unreadCount: 1,
            lastMessage: { body: 'hola atleta' },
        })
    })

    it('turns the double-check blue once the other side reads', async () => {
        const { coach, athlete, conversationId } = await linkAndConversation()
        await gql(
            `mutation { sendChatMessage(conversationId: "${conversationId}", body: "ping") { id } }`,
            coach.access,
        )

        await gql(`mutation { markConversationRead(conversationId: "${conversationId}") }`, athlete.access)

        const afterRead = await gql(
            `query { listChatMessages(conversationId: "${conversationId}") { items { status } } }`,
            coach.access,
        )
        expect(afterRead.body.data.listChatMessages.items[0].status).toBe('read')
    })

    it('becomes read-only after the athlete leaves, but history stays readable', async () => {
        const { coach, athlete, conversationId } = await linkAndConversation()
        await gql(
            `mutation { sendChatMessage(conversationId: "${conversationId}", body: "before leaving") { id } }`,
            coach.access,
        )

        // The athlete leaves the coach → the link breaks.
        const left = await gql(`mutation { leaveCoach(coachId: "${coach.userId}") }`, athlete.access)
        expect(left.body.errors).toBeUndefined()

        // Neither side can send any more.
        const blocked = await gql(
            `mutation { sendChatMessage(conversationId: "${conversationId}", body: "after") { id } }`,
            coach.access,
        )
        expect(blocked.body.errors[0].extensions.code).toBe('CONVERSATION_READ_ONLY')

        // But the prior history is still readable for both parties.
        const coachHistory = await gql(
            `query { listChatMessages(conversationId: "${conversationId}") { items { body } } }`,
            coach.access,
        )
        expect(coachHistory.body.data.listChatMessages.items).toEqual([{ body: 'before leaving' }])

        const athleteHistory = await gql(
            `query { listChatMessages(conversationId: "${conversationId}") { items { body } } }`,
            athlete.access,
        )
        expect(athleteHistory.body.data.listChatMessages.items).toEqual([{ body: 'before leaving' }])
    })

    it('reopens the same conversation for writing after re-linking', async () => {
        const { coach, athlete, conversationId } = await linkAndConversation()
        await gql(`mutation { leaveCoach(coachId: "${coach.userId}") }`, athlete.access)

        // Re-invite + re-accept the same pair.
        const reinvited = await gql(`mutation { inviteAthlete(email: "athlete@example.com") { id } }`, coach.access)
        await gql(
            `mutation { acceptInvitation(id: "${reinvited.body.data.inviteAthlete.id}") { status } }`,
            athlete.access,
        )

        // Same conversation id (identity is the pair), now writable again.
        const sent = await eventually(
            async () =>
                (
                    await gql(
                        `mutation { sendChatMessage(conversationId: "${conversationId}", body: "again") { id } }`,
                        coach.access,
                    )
                ).body,
            (body) => body.errors === undefined,
        )
        expect(sent.data.sendChatMessage.id).toBeDefined()
    })

    it('rejects a stranger touching a conversation that is not theirs', async () => {
        const { conversationId } = await linkAndConversation()
        const stranger = await register('stranger@example.com')

        const res = await gql(
            `query { listChatMessages(conversationId: "${conversationId}") { items { body } } }`,
            stranger.access,
        )
        expect(res.body.errors[0].extensions.code).toBe('NOT_YOUR_CONVERSATION')
    })
})
