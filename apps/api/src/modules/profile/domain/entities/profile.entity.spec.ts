import { describe, expect, it } from 'vitest'

import { InvalidBirthDateError } from '../errors/profile.errors'
import { BioVO } from '../value-objects/bio.vo'
import { BirthDateVO } from '../value-objects/birth-date.vo'
import { DisplayNameVO } from '../value-objects/display-name.vo'
import { HeightVO } from '../value-objects/height.vo'
import { PersonNameVO } from '../value-objects/person-name.vo'
import { SexVO } from '../value-objects/sex.vo'
import { ProfileAggregate } from './profile.entity'

const NOW = new Date('2026-01-01T00:00:00.000Z')

function newProfile(): ProfileAggregate {
    return ProfileAggregate.create({ userId: 'u-1', displayName: DisplayNameVO.create('lifter'), now: NOW })
}

describe('ProfileAggregate', () => {
    it('create() starts with the display name and empty optionals', () => {
        const profile = newProfile()
        expect(profile.userId).toBe('u-1')
        expect(profile.displayName.value).toBe('lifter')
        expect(profile.firstName).toBeNull()
        expect(profile.bio).toBeNull()
        expect(profile.avatarKey).toBeNull()
    })

    it('update() sets sex and height', () => {
        const profile = newProfile()
        profile.update({ sex: SexVO.create('male'), height: HeightVO.create(183) }, NOW)
        expect(profile.sex?.value).toBe('male')
        expect(profile.height?.value).toBe(183)
    })

    it('update() clears one field while leaving the rest untouched', () => {
        const profile = newProfile()
        profile.update({ firstName: PersonNameVO.create('Rafa'), bio: BioVO.create('Hi') }, NOW)

        profile.update({ bio: null }, NOW)
        expect(profile.bio).toBeNull()
        expect(profile.firstName?.value).toBe('Rafa')
    })

    it('update() rejects a future birth date', () => {
        const profile = newProfile()
        expect(() => profile.update({ birthDate: BirthDateVO.create('2030-01-01') }, NOW)).toThrow(
            InvalidBirthDateError,
        )
    })

    it('setAvatar() and removeAvatar() toggle the avatar key', () => {
        const profile = newProfile()
        expect(profile.avatarKey).toBeNull()

        profile.setAvatar('u-1.webp', NOW)
        expect(profile.avatarKey).toBe('u-1.webp')

        profile.removeAvatar(NOW)
        expect(profile.avatarKey).toBeNull()
    })

    it('fillMissingNames() backfills only empty names', () => {
        const profile = newProfile()
        profile.update({ firstName: PersonNameVO.create('Rafa') }, NOW)

        profile.fillMissingNames(
            { firstName: PersonNameVO.create('FromGoogle'), lastName: PersonNameVO.create('Lee') },
            NOW,
        )

        expect(profile.firstName?.value).toBe('Rafa')
        expect(profile.lastName?.value).toBe('Lee')
    })
})
