import 'server-only'

import { readFileSync } from 'node:fs'

import { z } from 'zod'

/**
 * Server-only web env — never shipped to the browser (guarded by `server-only`).
 * Holds non-public config and the RS256 public key. Importing this from a Client
 * Component is a build error by design.
 *
 * Note: this reads the PEM via `fs`, so it works in Node server contexts (server
 * components, route handlers) but NOT in the Edge middleware runtime.
 */
const schema = z.object({
    /** Proxy target used by next.config rewrites (also validated here for app use). */
    API_INTERNAL_URL: z.url().default('http://localhost:4000'),
    /**
     * Public canonical origin (scheme + host, no trailing slash), e.g.
     * `https://powerlog.negri.es`. Used only server-side to build SEO metadata
     * (canonical + hreflang), the sitemap and robots.txt. Read at BUILD time for the
     * statically rendered marketing pages, so prod bakes it via the Dockerfile ARG.
     */
    SITE_URL: z.url().default('http://localhost:3000'),
    /** RS256 public key as an inline PEM (preferred; supports multiline in .env). */
    JWT_PUBLIC_KEY: z.string().default(''),
    /** Fallback path to the public key, relative to the app root (cwd). */
    JWT_PUBLIC_KEY_PATH: z.string().min(1).default('jwt.public.pem'),
    /** Must match the API's JWT_ISSUER / JWT_AUDIENCE so verification accepts the token. */
    JWT_ISSUER: z.string().min(1).default('powerlog'),
    JWT_AUDIENCE: z.string().min(1).default('powerlog-web'),
    /** Cookie names, kept in sync with the API defaults (AUTH_/REFRESH_COOKIE_NAME). */
    AUTH_COOKIE_NAME: z.string().min(1).default('pl_at'),
    REFRESH_COOKIE_NAME: z.string().min(1).default('pl_rt'),
})

const parsed = schema.safeParse({
    API_INTERNAL_URL: process.env['API_INTERNAL_URL'],
    SITE_URL: process.env['SITE_URL'],
    JWT_PUBLIC_KEY: process.env['JWT_PUBLIC_KEY'],
    JWT_PUBLIC_KEY_PATH: process.env['JWT_PUBLIC_KEY_PATH'],
    JWT_ISSUER: process.env['JWT_ISSUER'],
    JWT_AUDIENCE: process.env['JWT_AUDIENCE'],
    AUTH_COOKIE_NAME: process.env['AUTH_COOKIE_NAME'],
    REFRESH_COOKIE_NAME: process.env['REFRESH_COOKIE_NAME'],
})

if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n')
    throw new Error(`Invalid server web env:\n${issues}`)
}

const data = parsed.data
let cachedPem: string | undefined

/** Env may carry a PEM with literal "\n"; turn those into real newlines. */
function normalizePem(value: string): string {
    return value.includes('\\n') ? value.replace(/\\n/g, '\n') : value
}

/**
 * Resolves the RS256 public key: the inline `JWT_PUBLIC_KEY` wins (multiline in
 * .env is fine); otherwise it's read from `JWT_PUBLIC_KEY_PATH`. Validated as an
 * SPKI PEM and cached.
 */
function readPublicKeyPem(): string {
    if (cachedPem !== undefined) return cachedPem

    const inline = normalizePem(data.JWT_PUBLIC_KEY).trim()
    let pem: string
    if (inline) {
        pem = inline
    } else {
        try {
            pem = readFileSync(data.JWT_PUBLIC_KEY_PATH, 'utf8')
        } catch {
            throw new Error(
                `JWT public key not set (JWT_PUBLIC_KEY) and no file found at "${data.JWT_PUBLIC_KEY_PATH}".`,
            )
        }
    }
    if (!pem.includes('-----BEGIN PUBLIC KEY-----')) {
        throw new Error('JWT public key is not a valid SPKI PEM (expected "BEGIN PUBLIC KEY").')
    }

    cachedPem = pem
    return pem
}

export const serverEnv = {
    apiInternalUrl: data.API_INTERNAL_URL,
    /** Canonical origin for SEO metadata, sitemap and robots (no trailing slash). */
    siteUrl: data.SITE_URL.replace(/\/$/, ''),
    jwtPublicKeyPath: data.JWT_PUBLIC_KEY_PATH,
    jwtIssuer: data.JWT_ISSUER,
    jwtAudience: data.JWT_AUDIENCE,
    authCookieName: data.AUTH_COOKIE_NAME,
    refreshCookieName: data.REFRESH_COOKIE_NAME,
    /** RS256 public key PEM (read + validated lazily, then cached). */
    get jwtPublicKeyPem(): string {
        return readPublicKeyPem()
    },
} as const
