import { describe, expect, it } from 'vitest'

import { AiProviderConfigMother } from '../../../../../tests/mothers/ai'
import { EncryptedSecretVO } from '../value-objects/encrypted-secret.vo'

const LATER = new Date('2026-02-01T00:00:00.000Z')

const anotherSecret = () => EncryptedSecretVO.create({ ciphertext: 'new', iv: 'iv', authTag: 'tag' })

describe('AiProviderConfigAggregate', () => {
    it('starts enabled with no model selected', () => {
        const config = AiProviderConfigMother.create()

        expect(config.enabled).toBe(true)
        expect(config.model).toBeNull()
    })

    it('moves the masked hint together with the key it describes', () => {
        const config = AiProviderConfigMother.create({ rawKey: 'sk-old-0123456789abcdef' })

        config.replaceKey(anotherSecret(), 'wxyz', LATER)

        expect(config.keyLast4).toBe('wxyz')
        expect(config.encryptedKey.ciphertext).toBe('new')
        expect(config.updatedAt).toEqual(LATER)
    })

    it('selects a model and clears it again', () => {
        const config = AiProviderConfigMother.create()

        config.setModel('gpt-5', LATER)
        expect(config.model).toBe('gpt-5')

        config.setModel(null, LATER)
        expect(config.model).toBeNull()
    })

    it('runs a task on its own model, or falls back to the default model', () => {
        const config = AiProviderConfigMother.create({ model: 'gpt-5' })

        // No per-task choice yet → both tasks use the provider default.
        expect(config.modelFor('mesocycle')).toBe('gpt-5')
        expect(config.modelFor('session_plan')).toBe('gpt-5')

        config.setTaskModel('mesocycle', 'claude-opus-5', LATER)

        // The mesocycle task takes its own model; the session plan still falls back.
        expect(config.modelFor('mesocycle')).toBe('claude-opus-5')
        expect(config.modelFor('session_plan')).toBe('gpt-5')

        // Clearing it goes back to the default.
        config.setTaskModel('mesocycle', null, LATER)
        expect(config.modelFor('mesocycle')).toBe('gpt-5')
    })

    it('disables without discarding the stored key', () => {
        const config = AiProviderConfigMother.create()

        config.setEnabled(false, LATER)

        expect(config.enabled).toBe(false)
        expect(config.keyLast4).toBe('abcd')
    })

    it('is not the default unless it is created as one', () => {
        expect(AiProviderConfigMother.create().isDefault).toBe(false)
        expect(AiProviderConfigMother.create({ isDefault: true }).isDefault).toBe(true)
    })

    it('steps up to and down from being the default', () => {
        const config = AiProviderConfigMother.create()

        config.setDefault(true, LATER)
        expect(config.isDefault).toBe(true)

        config.setDefault(false, LATER)
        expect(config.isDefault).toBe(false)
    })

    it('does not touch updatedAt when the default flag is unchanged', () => {
        const config = AiProviderConfigMother.create()
        const before = config.updatedAt

        config.setDefault(false, LATER)

        expect(config.updatedAt).toEqual(before)
    })

    it('does not touch updatedAt when the enabled flag is unchanged', () => {
        const config = AiProviderConfigMother.create()
        const before = config.updatedAt

        config.setEnabled(true, LATER)

        expect(config.updatedAt).toEqual(before)
    })
})
