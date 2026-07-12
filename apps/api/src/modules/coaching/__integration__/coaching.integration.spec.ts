import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../../database/schema'
import { CoachInvitationEntity } from '../domain/entities/coach-invitation.entity'
import { DrizzleCoachInvitationRepository } from '../infrastructure/persistence/repositories/drizzle-coach-invitation.repository'
import { DrizzleCoachLinkRepository } from '../infrastructure/persistence/repositories/drizzle-coach-link.repository'
import { DrizzleCoachNoteRepository } from '../infrastructure/persistence/repositories/drizzle-coach-note.repository'

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let invitations: DrizzleCoachInvitationRepository
let links: DrizzleCoachLinkRepository
let notes: DrizzleCoachNoteRepository

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    invitations = new DrizzleCoachInvitationRepository(db)
    links = new DrizzleCoachLinkRepository(db)
    notes = new DrizzleCoachNoteRepository(db)
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    await db.execute(
        sql`TRUNCATE TABLE coach_athlete_invitations, coach_athlete, coach_athlete_notes RESTART IDENTITY CASCADE`,
    )
})

describe('Coaching invitations (integration)', () => {
    it('persists an invitation, finds it pending, and applies a status transition', async () => {
        const coachId = randomUUID()
        const athleteId = randomUUID()
        const email = 'athlete@example.com'
        const invitation = CoachInvitationEntity.create({
            id: randomUUID(),
            coachId,
            email,
            athleteId,
            now: new Date('2026-03-01T00:00:00Z'),
        })
        await invitations.save(invitation)

        expect((await invitations.findPendingByEmail(coachId, email))?.id).toBe(invitation.id)
        expect((await invitations.listPendingForAthlete(athleteId)).map((i) => i.id)).toEqual([invitation.id])

        invitation.accept(new Date('2026-03-02T00:00:00Z'))
        await invitations.save(invitation)

        expect((await invitations.findById(invitation.id))?.status).toBe('accepted')
        expect(await invitations.findPendingByEmail(coachId, email)).toBeNull()
    })
})

describe('Coach links (integration)', () => {
    it('links idempotently and lists both directions', async () => {
        const coachId = randomUUID()
        const athleteId = randomUUID()

        await links.link(coachId, athleteId, new Date())
        await links.link(coachId, athleteId, new Date()) // no duplicate

        expect(await links.areLinked(coachId, athleteId)).toBe(true)
        expect(await links.coachIdsOf(athleteId)).toEqual([coachId])
        expect(await links.athleteIdsOf(coachId)).toEqual([athleteId])

        const rows = await db.select().from(schema.coachAthlete)
        expect(rows).toHaveLength(1)
    })
})

describe('Coach notes (integration)', () => {
    it('upserts, reads and clears a coach note', async () => {
        const coachId = randomUUID()
        const athleteId = randomUUID()

        expect(await notes.get(coachId, athleteId)).toBeNull()

        await notes.upsert(coachId, athleteId, 'first pass', new Date('2026-04-01T00:00:00Z'))
        expect((await notes.get(coachId, athleteId))?.body).toBe('first pass')

        // Same (coach, athlete) upserts in place — no duplicate row.
        await notes.upsert(coachId, athleteId, 'revised', new Date('2026-04-02T00:00:00Z'))
        expect((await notes.get(coachId, athleteId))?.body).toBe('revised')
        expect(await db.select().from(schema.coachAthleteNotes)).toHaveLength(1)

        await notes.clear(coachId, athleteId)
        expect(await notes.get(coachId, athleteId)).toBeNull()
    })
})
