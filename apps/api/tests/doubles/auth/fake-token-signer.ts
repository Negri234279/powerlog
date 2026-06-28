import { type AccessTokenClaims, TokenSigner } from '../../../src/modules/auth/application/ports/token-signer.port'

// Encodes the claims verbatim so tests can assert what went into the token
// (sub/email/username/role/isAdmin) without real RS256. e2e uses the real JoseTokenSigner.
const PREFIX = 'signed:'

export class FakeTokenSigner extends TokenSigner {
    async signAccessToken(claims: AccessTokenClaims): Promise<string> {
        return `${PREFIX}${JSON.stringify(claims)}`
    }

    async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
        if (!token.startsWith(PREFIX)) {
            throw new Error('Invalid access token.')
        }
        return JSON.parse(token.slice(PREFIX.length)) as AccessTokenClaims
    }
}
