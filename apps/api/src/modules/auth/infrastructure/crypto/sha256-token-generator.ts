import { createHash, randomBytes } from 'node:crypto'

import { Injectable } from '@nestjs/common'

import { type GeneratedToken, OpaqueTokenGenerator } from '../../application/ports/opaque-token-generator.port'

/**
 * Opaque single-use tokens: 256 bits of randomness, base64url-encoded. Only the
 * SHA-256 hash is persisted, so a DB leak never yields a usable token.
 */
@Injectable()
export class Sha256TokenGenerator extends OpaqueTokenGenerator {
    generate(): GeneratedToken {
        const raw = randomBytes(32).toString('base64url')

        return {
            raw,
            hash: this.hash(raw),
        }
    }

    hash(raw: string): string {
        return createHash('sha256').update(raw).digest('hex')
    }
}
