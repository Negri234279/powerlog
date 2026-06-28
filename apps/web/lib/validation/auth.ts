import { z } from 'zod'

/** Mirrors the API's register/login validation so the client fails fast. */
export const loginSchema = z.object({
    email: z.email('Enter a valid email address.'),
    password: z.string().min(1, 'Password is required.'),
})

/** Native form inputs yield "" (or null) when empty; treat that as "not provided". */
const blankToUndefined = (v: unknown) => (v == null || (typeof v === 'string' && v.trim() === '') ? undefined : v)

export const registerSchema = z.object({
    email: z.email('Enter a valid email address.'),
    username: z
        .string()
        .trim()
        .min(3, 'Use 3–30 characters.')
        .max(30, 'Use 3–30 characters.')
        .regex(/^[a-z0-9_]+$/i, 'Only a–z, 0–9 and underscore.'),
    password: z.string().min(8, 'At least 8 characters.').max(200),
    units: z.enum(['kg', 'lb']),
    // Optional profile details (provisioned with the account). Mirror the API.
    firstName: z.preprocess(blankToUndefined, z.string().trim().min(1).max(60, 'Use up to 60 characters.').optional()),
    lastName: z.preprocess(blankToUndefined, z.string().trim().min(1).max(60, 'Use up to 60 characters.').optional()),
    birthDate: z.preprocess(
        blankToUndefined,
        z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date.')
            .optional(),
    ),
    heightCm: z.preprocess(
        (v) => {
            const cleaned = blankToUndefined(v)
            return cleaned === undefined ? undefined : Number(cleaned)
        },
        z
            .number({ message: 'Enter a number.' })
            .int('Whole centimetres.')
            .min(50, 'Between 50 and 300 cm.')
            .max(300, 'Between 50 and 300 cm.')
            .optional(),
    ),
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>

/** Flattens a ZodError into `{ field: firstMessage }` for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
    const out: Record<string, string> = {}
    for (const issue of error.issues) {
        const key = issue.path[0]
        if (typeof key === 'string' && !out[key]) out[key] = issue.message
    }
    return out
}
