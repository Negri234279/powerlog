import { InvalidBirthDateError } from '../errors/profile.errors'
import type { BioVO } from '../value-objects/bio.vo'
import type { BirthDateVO } from '../value-objects/birth-date.vo'
import type { DisplayNameVO } from '../value-objects/display-name.vo'
import type { HeightVO } from '../value-objects/height.vo'
import type { PersonNameVO } from '../value-objects/person-name.vo'
import type { SexVO } from '../value-objects/sex.vo'

export interface ProfileProps {
    /** Identity: 1:1 with the auth user (no separate id). */
    userId: string
    displayName: DisplayNameVO
    firstName: PersonNameVO | null
    lastName: PersonNameVO | null
    birthDate: BirthDateVO | null
    sex: SexVO | null
    height: HeightVO | null
    bio: BioVO | null
    /** Storage key of the avatar in object storage; null → default avatar. */
    avatarKey: string | null
    country: string | null
    timezone: string | null
    locale: string | null
    createdAt: Date
    updatedAt: Date
}

/**
 * Partial update. `undefined` = leave unchanged, `null` = clear, value = set.
 * `displayName` is required so it can't be cleared.
 */
export interface UpdateProfileFields {
    displayName?: DisplayNameVO
    firstName?: PersonNameVO | null
    lastName?: PersonNameVO | null
    birthDate?: BirthDateVO | null
    sex?: SexVO | null
    height?: HeightVO | null
    bio?: BioVO | null
    country?: string | null
    timezone?: string | null
    locale?: string | null
}

/**
 * `ProfileAggregate` — the user's profile, the aggregate root of the profile
 * context. Created reactively from a `UserRegisteredIntegrationEvent`. No domain
 * events yet (no consumer needs them), so it doesn't extend `AggregateRoot`.
 */
export class ProfileAggregate {
    private constructor(private readonly props: ProfileProps) {}

    /** Create a fresh profile. Optional name/avatar come from the auth source (e.g. Google). */
    static create(input: {
        userId: string
        displayName: DisplayNameVO
        firstName?: PersonNameVO | null
        lastName?: PersonNameVO | null
        avatarKey?: string | null
        now: Date
    }): ProfileAggregate {
        return new ProfileAggregate({
            userId: input.userId,
            displayName: input.displayName,
            firstName: input.firstName ?? null,
            lastName: input.lastName ?? null,
            birthDate: null,
            sex: null,
            height: null,
            bio: null,
            avatarKey: input.avatarKey ?? null,
            country: null,
            timezone: null,
            locale: null,
            createdAt: input.now,
            updatedAt: input.now,
        })
    }

    static rehydrate(props: ProfileProps): ProfileAggregate {
        return new ProfileAggregate(props)
    }

    /** Apply a partial update; only provided keys change. Birth date can't be future. */
    update(fields: UpdateProfileFields, now: Date): void {
        if (fields.birthDate && fields.birthDate.toDate().getTime() > now.getTime()) {
            throw new InvalidBirthDateError('Birth date cannot be in the future.')
        }
        if (fields.displayName !== undefined) this.props.displayName = fields.displayName
        if (fields.firstName !== undefined) this.props.firstName = fields.firstName
        if (fields.lastName !== undefined) this.props.lastName = fields.lastName
        if (fields.birthDate !== undefined) this.props.birthDate = fields.birthDate
        if (fields.sex !== undefined) this.props.sex = fields.sex
        if (fields.height !== undefined) this.props.height = fields.height
        if (fields.bio !== undefined) this.props.bio = fields.bio
        if (fields.country !== undefined) this.props.country = fields.country
        if (fields.timezone !== undefined) this.props.timezone = fields.timezone
        if (fields.locale !== undefined) this.props.locale = fields.locale
        this.props.updatedAt = now
    }

    /** Point the avatar at a stored object key (replaces any previous one). */
    setAvatar(key: string, now: Date): void {
        this.props.avatarKey = key
        this.props.updatedAt = now
    }

    /** Drop the custom avatar (falls back to the default). */
    removeAvatar(now: Date): void {
        if (this.props.avatarKey === null) return
        this.props.avatarKey = null
        this.props.updatedAt = now
    }

    /** Backfill first/last name only where currently empty (e.g. on Google link). */
    fillMissingNames(input: { firstName?: PersonNameVO; lastName?: PersonNameVO }, now: Date): void {
        let changed = false
        if (input.firstName && this.props.firstName === null) {
            this.props.firstName = input.firstName
            changed = true
        }
        if (input.lastName && this.props.lastName === null) {
            this.props.lastName = input.lastName
            changed = true
        }
        if (changed) this.props.updatedAt = now
    }

    get userId(): string {
        return this.props.userId
    }
    get displayName(): DisplayNameVO {
        return this.props.displayName
    }
    get firstName(): PersonNameVO | null {
        return this.props.firstName
    }
    get lastName(): PersonNameVO | null {
        return this.props.lastName
    }
    get birthDate(): BirthDateVO | null {
        return this.props.birthDate
    }
    get sex(): SexVO | null {
        return this.props.sex
    }
    get height(): HeightVO | null {
        return this.props.height
    }
    get bio(): BioVO | null {
        return this.props.bio
    }
    get avatarKey(): string | null {
        return this.props.avatarKey
    }
    get country(): string | null {
        return this.props.country
    }
    get timezone(): string | null {
        return this.props.timezone
    }
    get locale(): string | null {
        return this.props.locale
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
    get updatedAt(): Date {
        return this.props.updatedAt
    }
}
