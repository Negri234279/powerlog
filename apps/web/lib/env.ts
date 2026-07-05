import { z } from 'zod'

/**
 * Public web env — `NEXT_PUBLIC_*` vars, inlined into the client bundle at build.
 * Safe to import from both client and server components. Read env from here
 * (not raw `process.env`) so it's validated in one place.
 *
 * Each var MUST be referenced as a static `process.env['NEXT_PUBLIC_…']` literal
 * so Next can statically replace it at build time.
 */
const schema = z.object({
    // Same-origin BFF path by default; the rewrite in next.config forwards it to
    // the API (handling the dev :3000 → :4000 port hop server-side).
    NEXT_PUBLIC_API_URL: z.string().min(1).default('http://localhost:4000'),
    // Default to the same-origin BFF proxy path (resolved against the live origin
    // in the browser) so localhost and dev tunnels both work without CORS.
    NEXT_PUBLIC_GRAPHQL_URL: z.string().min(1).default('/api/graphql'),
    // Optional link to the always-on Grafana (RUM + logs + traces + metrics),
    // surfaced on the admin panel. Absent → the link is simply not shown.
    NEXT_PUBLIC_GRAFANA_URL: z.string().url().optional(),
})

const parsed = schema.safeParse({
    NEXT_PUBLIC_API_URL: process.env['NEXT_PUBLIC_API_URL'],
    NEXT_PUBLIC_GRAPHQL_URL: process.env['NEXT_PUBLIC_GRAPHQL_URL'],
    NEXT_PUBLIC_GRAFANA_URL: process.env['NEXT_PUBLIC_GRAFANA_URL'],
})

if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n')
    throw new Error(`Invalid public web env:\n${issues}`)
}

export const env = {
    apiUrl: parsed.data.NEXT_PUBLIC_API_URL,
    graphqlUrl: parsed.data.NEXT_PUBLIC_GRAPHQL_URL,
    grafanaUrl: parsed.data.NEXT_PUBLIC_GRAFANA_URL ?? null,
} as const
