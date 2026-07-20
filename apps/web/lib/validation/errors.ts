import type { z } from 'zod'

/** Flattens a ZodError into `{ field: firstMessage }` for inline form errors. The
 *  message is a stable key the form translates at render — never prose. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
    const out: Record<string, string> = {}
    for (const issue of error.issues) {
        const key = issue.path[0]
        if (typeof key === 'string' && !out[key]) out[key] = issue.message
    }
    return out
}
