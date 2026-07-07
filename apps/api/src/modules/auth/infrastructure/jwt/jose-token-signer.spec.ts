import { generateKeyPairSync } from 'node:crypto'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import type { ConfigService } from '@nestjs/config'
import { afterAll, describe, expect, it } from 'vitest'

import type { Env } from '../../../../config/env'
import { JoseTokenSigner } from './jose-token-signer'

const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

const dir = mkdtempSync(join(tmpdir(), 'pl-jwt-'))
const privateKeyPath = join(dir, 'jwt.private.pem')
writeFileSync(privateKeyPath, privateKey)

afterAll(() => rmSync(dir, { recursive: true, force: true }))

function signerWith(overrides: Record<string, string>): JoseTokenSigner {
    const map: Record<string, string> = {
        JWT_ISSUER: 'powerlog',
        JWT_AUDIENCE: 'powerlog-web',
        JWT_EXPIRES_IN: '15m',
        JWT_PRIVATE_KEY: '',
        JWT_PUBLIC_KEY: '',
        JWT_PRIVATE_KEY_PATH: join(dir, 'missing.pem'),
        JWT_PUBLIC_KEY_PATH: join(dir, 'missing.pem'),
        ...overrides,
    }
    const config = { get: (key: string) => map[key] } as unknown as ConfigService<Env, true>
    return new JoseTokenSigner(config)
}

const claims = {
    userId: 'u-1',
    email: 'a@b.com',
    username: 'alice',
    role: 'athlete',
    isAdmin: false,
    avatar: 'https://cdn.example.com/avatars/u-1.webp',
    locale: 'es-ES',
} as const

describe('JoseTokenSigner', () => {
    it('reads the private key from a file path and round-trips a token', async () => {
        const signer = signerWith({ JWT_PRIVATE_KEY_PATH: privateKeyPath, JWT_PUBLIC_KEY: publicKey })

        const token = await signer.signAccessToken(claims)

        expect(await signer.verifyAccessToken(token)).toEqual(claims)
    })

    it('prefers the inline PEM over the file path', async () => {
        // Path points nowhere, but the inline key is set → still works.
        const signer = signerWith({ JWT_PRIVATE_KEY: privateKey, JWT_PUBLIC_KEY: publicKey })

        const token = await signer.signAccessToken(claims)

        expect((await signer.verifyAccessToken(token)).userId).toBe('u-1')
    })

    it('throws when neither the inline key nor a key file is available', async () => {
        const signer = signerWith({})
        await expect(signer.signAccessToken(claims)).rejects.toThrow(/no key file/)
    })
})
