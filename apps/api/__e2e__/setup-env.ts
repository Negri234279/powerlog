import { generateKeyPairSync } from 'node:crypto'

// Runs before every test module (vitest setupFiles), i.e. BEFORE any static
// import of AppModule. @nestjs/config's forRoot() reads + validates process.env
// at call time (when AppModule's decorator is evaluated on import), so every
// value the app needs must be present here. The only dynamic value, the
// Testcontainers DATABASE_URL, is injected via a PG_POOL provider override in
// the e2e suite; the placeholder below just satisfies env.ts validation.
process.env['DATABASE_URL'] ??= 'postgres://placeholder:5432/placeholder'
process.env['APP_ENV'] ??= 'test'
process.env['NODE_ENV'] ??= 'test'
process.env['JWT_ISSUER'] ??= 'powerlog'
process.env['JWT_AUDIENCE'] ??= 'powerlog-web'
process.env['JWT_EXPIRES_IN'] ??= '15m'
process.env['REFRESH_EXPIRES_IN'] ??= '30d'
process.env['AUTH_COOKIE_NAME'] ??= 'pl_at'
process.env['REFRESH_COOKIE_NAME'] ??= 'pl_rt'
process.env['COOKIE_SECURE'] ??= 'false'
process.env['GOOGLE_CLIENT_ID'] ??= 'test-google-client-id'
process.env['GOOGLE_CLIENT_SECRET'] ??= 'test-google-secret'
process.env['GOOGLE_CALLBACK_URL'] ??= 'http://localhost:4000/auth/google/callback'
process.env['WEB_ORIGIN'] ??= 'http://localhost:3000'
process.env['OTEL_SDK_DISABLED'] ??= 'true'
// Avatars: pin the local filesystem adapter. Assigned (not `??=`) on purpose —
// `apps/api/.env` may point AVATAR_STORAGE at R2 for staging/prod, and dotenv
// never overrides what is already set, so this keeps the suite hermetic.
process.env['AVATAR_STORAGE'] = 'filesystem'
process.env['AVATAR_DIR'] = './var/avatars-e2e'
process.env['AVATAR_PUBLIC_BASE_URL'] = 'http://localhost:4000/avatars'
// 32 zero bytes, base64. Only shape matters: the cipher validates the length.
process.env['AI_ENCRYPTION_KEY'] ??= Buffer.alloc(32).toString('base64')

// Real RS256 keypair (SPKI/PKCS8 PEMs) so the e2e suite signs/verifies access
// tokens for real. Sync generation avoids top-level await (this is a CJS module).
if (!process.env['JWT_PRIVATE_KEY']) {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })
    process.env['JWT_PRIVATE_KEY'] = privateKey
    process.env['JWT_PUBLIC_KEY'] = publicKey
}
