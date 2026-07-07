import { readFileSync } from 'node:fs'

import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { importPKCS8, importSPKI, jwtVerify, SignJWT } from 'jose'

import type { Env } from '../../../../config/env'
import { type AccessTokenClaims, TokenSigner } from '../../application/ports/token-signer.port'

const ALG = 'RS256'

/** Env may carry PEMs with literal "\n"; turn them into real newlines. */
function normalizePem(value: string): string {
    return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value
}

/**
 * Access-token signer/verifier using jose (RS256). Keys are imported lazily and
 * cached, so the app still boots when JWT keys are absent — only auth fails,
 * with a clear error, instead of crashing startup.
 */
@Injectable()
export class JoseTokenSigner extends TokenSigner {
    private signKey?: ReturnType<typeof importPKCS8>
    private verifyKey?: ReturnType<typeof importSPKI>

    constructor(private readonly config: ConfigService<Env, true>) {
        super()
    }

    async signAccessToken(claims: AccessTokenClaims): Promise<string> {
        return new SignJWT({
            email: claims.email,
            username: claims.username,
            role: claims.role,
            isAdmin: claims.isAdmin,
            avatar: claims.avatar,
            locale: claims.locale,
        })
            .setProtectedHeader({ alg: ALG })
            .setSubject(claims.userId)
            .setIssuer(this.config.get('JWT_ISSUER', { infer: true }))
            .setAudience(this.config.get('JWT_AUDIENCE', { infer: true }))
            .setIssuedAt()
            .setExpirationTime(this.config.get('JWT_EXPIRES_IN', { infer: true }))
            .sign(await this.getSignKey())
    }

    async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
        const { payload } = await jwtVerify(token, await this.getVerifyKey(), {
            algorithms: [ALG],
            issuer: this.config.get('JWT_ISSUER', { infer: true }),
            audience: this.config.get('JWT_AUDIENCE', { infer: true }),
        })

        if (!payload.sub) {
            throw new Error('Access token has no subject.')
        }

        const { email, username, role, isAdmin, avatar, locale: rawLocale } = payload
        // Tokens minted before locale was added carry no claim → treat as null.
        const locale = rawLocale === undefined ? null : rawLocale

        if (
            typeof email !== 'string' ||
            typeof username !== 'string' ||
            (role !== 'athlete' && role !== 'coach') ||
            typeof isAdmin !== 'boolean' ||
            (avatar !== null && typeof avatar !== 'string') ||
            (locale !== null && typeof locale !== 'string')
        ) {
            throw new Error('Access token is missing required claims.')
        }

        return { userId: payload.sub, email, username, role, isAdmin, avatar, locale }
    }

    private getSignKey(): ReturnType<typeof importPKCS8> {
        if (!this.signKey) {
            this.signKey = importPKCS8(this.loadPem('JWT_PRIVATE_KEY', 'JWT_PRIVATE_KEY_PATH'), ALG)
        }

        return this.signKey
    }

    private getVerifyKey(): ReturnType<typeof importSPKI> {
        if (!this.verifyKey) {
            this.verifyKey = importSPKI(this.loadPem('JWT_PUBLIC_KEY', 'JWT_PUBLIC_KEY_PATH'), ALG)
        }

        return this.verifyKey
    }

    /**
     * Resolves a PEM: the inline env var wins (e.g. injected in prod); otherwise
     * the key is read from the file at the configured path (default
     * `jwt.private.pem` / `jwt.public.pem`, relative to the working directory).
     */
    private loadPem(
        inlineKey: 'JWT_PRIVATE_KEY' | 'JWT_PUBLIC_KEY',
        pathKey: 'JWT_PRIVATE_KEY_PATH' | 'JWT_PUBLIC_KEY_PATH',
    ): string {
        const inline = normalizePem(this.config.get(inlineKey, { infer: true }))
        if (inline) return inline

        const path = this.config.get(pathKey, { infer: true })

        try {
            return readFileSync(path, 'utf8')
        } catch {
            throw new Error(`${inlineKey} is not set and no key file was found at "${path}".`)
        }
    }
}
