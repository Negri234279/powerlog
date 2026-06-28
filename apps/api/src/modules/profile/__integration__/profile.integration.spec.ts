import { randomUUID } from 'node:crypto'

import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import * as schema from '../../../database/schema'
import { ProfileAggregate } from '../domain/entities/profile.entity'
import { BioVO } from '../domain/value-objects/bio.vo'
import { BirthDateVO } from '../domain/value-objects/birth-date.vo'
import { DisplayNameVO } from '../domain/value-objects/display-name.vo'
import { HeightVO } from '../domain/value-objects/height.vo'
import { PersonNameVO } from '../domain/value-objects/person-name.vo'
import { SexVO } from '../domain/value-objects/sex.vo'
import { DrizzleProfileRepository } from '../infrastructure/persistence/repositories/drizzle-profile.repository'

const NOW = new Date('2026-01-01T00:00:00.000Z')

let container: StartedPostgreSqlContainer
let pool: Pool
let db: NodePgDatabase<typeof schema>
let profiles: DrizzleProfileRepository

beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start()
    pool = new Pool({ connectionString: container.getConnectionUri() })
    db = drizzle(pool, { schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    profiles = new DrizzleProfileRepository(db)
}, 120_000)

afterAll(async () => {
    await pool?.end()
    await container?.stop()
})

beforeEach(async () => {
    await db.execute(sql`TRUNCATE TABLE profiles RESTART IDENTITY CASCADE`)
})

describe('Profile persistence (integration)', () => {
    it('persists and recovers a fully-populated profile with correct types', async () => {
        const userId = randomUUID()
        const profile = ProfileAggregate.create({
            userId,
            displayName: DisplayNameVO.create('rafa'),
            firstName: PersonNameVO.create('Rafa'),
            now: NOW,
        })
        profile.update(
            {
                lastName: PersonNameVO.create('Lifter'),
                birthDate: BirthDateVO.create('1995-07-15'),
                sex: SexVO.create('male'),
                height: HeightVO.create(183),
                bio: BioVO.create('Powerlifter'),
                country: 'ES',
                timezone: 'Europe/Madrid',
                locale: 'es-ES',
            },
            NOW,
        )
        await profiles.save(profile)

        const found = await profiles.findByUserId(userId)
        expect(found?.displayName.value).toBe('rafa')
        expect(found?.lastName?.value).toBe('Lifter')
        expect(found?.birthDate?.value).toBe('1995-07-15')
        expect(found?.sex?.value).toBe('male')
        expect(found?.height?.value).toBe(183)
        expect(found?.bio?.value).toBe('Powerlifter')
        expect(found?.country).toBe('ES')
        expect(found?.avatarKey).toBeNull()
        expect(found?.createdAt).toBeInstanceOf(Date)
    })

    it('upserts on save (a second save updates the same row)', async () => {
        const userId = randomUUID()
        const profile = ProfileAggregate.create({ userId, displayName: DisplayNameVO.create('rafa'), now: NOW })
        await profiles.save(profile)

        const reloaded = await profiles.findByUserId(userId)
        reloaded!.update({ bio: BioVO.create('Updated') }, NOW)
        await profiles.save(reloaded!)

        const rows = await db.select().from(schema.profiles)
        expect(rows).toHaveLength(1)
        expect((await profiles.findByUserId(userId))?.bio?.value).toBe('Updated')
    })
})
