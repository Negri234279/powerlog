import { describe, expect, it } from 'vitest'

import { FakeClock, InMemoryProfileRepository } from '../../../../../../tests/doubles/profile'
import { ProvisionProfileCommand } from '../../../../../shared/contracts/provision-profile.command'
import { DisplayNameAlreadyInUseError, InvalidHeightError } from '../../../domain/errors/profile.errors'
import { HandleGenerator } from '../../services/handle-generator.service'
import { ProvisionProfileHandler } from './provision-profile.handler'

const NOW = new Date('2026-01-01T00:00:00.000Z')

function setup() {
    const profiles = new InMemoryProfileRepository()
    const handler = new ProvisionProfileHandler(profiles, new FakeClock(NOW), new HandleGenerator(profiles))
    return { profiles, handler }
}

describe('ProvisionProfileHandler', () => {
    it('names the profile after the chosen handle and stores the optional details', async () => {
        const { profiles, handler } = setup()

        await handler.execute(
            new ProvisionProfileCommand(
                'u-1',
                'ada@example.com',
                'adahandle',
                'Ada',
                'Lovelace',
                '1990-12-10',
                170,
                'es',
            ),
        )

        const profile = profiles.all()[0]
        expect(profile?.userId).toBe('u-1')
        expect(profile?.displayName.value).toBe('adahandle')
        expect(profile?.firstName?.value).toBe('Ada')
        expect(profile?.lastName?.value).toBe('Lovelace')
        expect(profile?.birthDate?.value).toBe('1990-12-10')
        expect(profile?.height?.value).toBe(170)
        expect(profile?.locale).toBe('es')
    })

    it('generates a unique handle from the email when none is chosen (e.g. Google)', async () => {
        const { profiles, handler } = setup()

        await handler.execute(new ProvisionProfileCommand('u-2', 'ironmike@example.com'))

        const profile = profiles.all()[0]
        expect(profile?.displayName.value).toBe('ironmike')
        expect(profile?.firstName).toBeNull()
    })

    it('rejects a chosen handle already taken by another profile', async () => {
        const { handler } = setup()
        await handler.execute(new ProvisionProfileCommand('u-1', 'a@example.com', 'takenhandle'))

        await expect(
            handler.execute(new ProvisionProfileCommand('u-2', 'b@example.com', 'takenhandle')),
        ).rejects.toBeInstanceOf(DisplayNameAlreadyInUseError)
    })

    it('is idempotent on userId — a second call keeps the first profile', async () => {
        const { profiles, handler } = setup()

        await handler.execute(new ProvisionProfileCommand('u-3', 'a@example.com', 'firsthandle', 'First'))
        await handler.execute(new ProvisionProfileCommand('u-3', 'b@example.com', 'secondhandle', 'Second'))

        expect(profiles.all()).toHaveLength(1)
        expect(profiles.all()[0]?.firstName?.value).toBe('First')
    })

    it('propagates a domain error for an invalid height (so registration can roll back)', async () => {
        const { handler } = setup()

        await expect(
            handler.execute(new ProvisionProfileCommand('u-4', 'mike@example.com', 'mikehandle', null, null, null, 10)),
        ).rejects.toBeInstanceOf(InvalidHeightError)
    })
})
