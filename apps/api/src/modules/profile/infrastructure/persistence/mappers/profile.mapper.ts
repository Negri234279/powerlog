import { ProfileAggregate } from '../../../domain/entities/profile.entity'
import { BioVO } from '../../../domain/value-objects/bio.vo'
import { BirthDateVO } from '../../../domain/value-objects/birth-date.vo'
import { DisplayNameVO } from '../../../domain/value-objects/display-name.vo'
import { HeightVO } from '../../../domain/value-objects/height.vo'
import { PersonNameVO } from '../../../domain/value-objects/person-name.vo'
import { SexVO } from '../../../domain/value-objects/sex.vo'
import type { profiles } from '../schema/profiles.schema'

type ProfileRow = typeof profiles.$inferSelect

/** Maps the Profile aggregate to/from its `profiles` row. */
export const ProfileMapper = {
    toDomain(row: ProfileRow): ProfileAggregate {
        return ProfileAggregate.rehydrate({
            userId: row.userId,
            displayName: DisplayNameVO.create(row.displayName),
            firstName: row.firstName ? PersonNameVO.create(row.firstName) : null,
            lastName: row.lastName ? PersonNameVO.create(row.lastName) : null,
            birthDate: row.birthDate ? BirthDateVO.create(row.birthDate) : null,
            sex: row.sex ? SexVO.create(row.sex) : null,
            height: row.heightCm !== null ? HeightVO.create(row.heightCm) : null,
            bio: row.bio ? BioVO.create(row.bio) : null,
            avatarKey: row.avatarKey,
            country: row.country,
            timezone: row.timezone,
            locale: row.locale,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        })
    },

    toPersistence(profile: ProfileAggregate): typeof profiles.$inferInsert {
        return {
            userId: profile.userId,
            displayName: profile.displayName.value,
            firstName: profile.firstName?.value ?? null,
            lastName: profile.lastName?.value ?? null,
            birthDate: profile.birthDate?.value ?? null,
            sex: profile.sex?.value ?? null,
            heightCm: profile.height?.value ?? null,
            bio: profile.bio?.value ?? null,
            avatarKey: profile.avatarKey,
            country: profile.country,
            timezone: profile.timezone,
            locale: profile.locale,
            createdAt: profile.createdAt,
            updatedAt: profile.updatedAt,
        }
    },
}
