import { Inject, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'

import { type Database, DRIZZLE } from '../../../../../database/database.module'
import { ProfileAggregate } from '../../../domain/entities/profile.entity'
import { ProfileRepository } from '../../../domain/repositories/profile.repository'
import { profiles } from '../schema/profiles.schema'
import { ProfileMapper } from '../mappers/profile.mapper'

@Injectable()
export class DrizzleProfileRepository extends ProfileRepository {
    constructor(@Inject(DRIZZLE) private readonly db: Database) {
        super()
    }

    async findByUserId(userId: string): Promise<ProfileAggregate | null> {
        const [row] = await this.db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1)
        return row ? ProfileMapper.toDomain(row) : null
    }

    async findByDisplayName(displayName: string): Promise<ProfileAggregate | null> {
        const [row] = await this.db.select().from(profiles).where(eq(profiles.displayName, displayName)).limit(1)
        return row ? ProfileMapper.toDomain(row) : null
    }

    async deleteByUserId(userId: string): Promise<void> {
        await this.db.delete(profiles).where(eq(profiles.userId, userId))
    }

    async save(profile: ProfileAggregate): Promise<void> {
        const row = ProfileMapper.toPersistence(profile)
        await this.db
            .insert(profiles)
            .values(row)
            .onConflictDoUpdate({
                target: profiles.userId,
                set: {
                    displayName: row.displayName,
                    firstName: row.firstName,
                    lastName: row.lastName,
                    birthDate: row.birthDate,
                    sex: row.sex,
                    heightCm: row.heightCm,
                    bio: row.bio,
                    avatarKey: row.avatarKey,
                    country: row.country,
                    timezone: row.timezone,
                    locale: row.locale,
                    updatedAt: row.updatedAt,
                },
            })
    }
}
