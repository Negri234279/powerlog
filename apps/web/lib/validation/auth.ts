import { z } from 'zod'

import { SUPPORTED_LOCALES } from '@/lib/i18n/config'

// `fieldErrors` is generic (any ZodError → inline errors); it lives in its own module
// and is re-exported here so existing `@/lib/validation/auth` importers keep working.
export { fieldErrors } from './errors'

// Validation messages are emitted as stable keys (not prose) so the forms can
// translate them via the `auth.errors` namespace. See `fieldErrors`.
export const loginSchema = z.object({
    email: z.email('invalidEmail'),
    password: z.string().min(1, 'passwordRequired'),
})

/** Native form inputs yield "" (or null) when empty; treat that as "not provided". */
const blankToUndefined = (v: unknown) => (v == null || (typeof v === 'string' && v.trim() === '') ? undefined : v)

export const registerSchema = z.object({
    email: z.email('invalidEmail'),
    username: z
        .string()
        .trim()
        .min(3, 'usernameLength')
        .max(30, 'usernameLength')
        .regex(/^[a-z0-9_]+$/i, 'usernameChars'),
    password: z.string().min(8, 'passwordMin').max(200),
    units: z.enum(['kg', 'lb']),
    // Preferred UI locale, defaulted to the browser language in the form and
    // persisted to the new profile so it survives to a fresh device.
    locale: z.enum(SUPPORTED_LOCALES),
    // Optional profile details (provisioned with the account). Mirror the API.
    firstName: z.preprocess(blankToUndefined, z.string().trim().min(1).max(60, 'nameMax').optional()),
    lastName: z.preprocess(blankToUndefined, z.string().trim().min(1).max(60, 'nameMax').optional()),
    birthDate: z.preprocess(
        blankToUndefined,
        z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'invalidDate')
            // No future birth dates. Lexicographic compare is exact for YYYY-MM-DD;
            // `en-CA` is the local ISO date, so it matches the input's `max`.
            .refine((value) => value <= new Date().toLocaleDateString('en-CA'), 'birthFuture')
            .optional(),
    ),
    heightCm: z.preprocess(
        (v) => {
            const cleaned = blankToUndefined(v)
            return cleaned === undefined ? undefined : Number(cleaned)
        },
        z
            .number({ message: 'heightNumber' })
            .int('heightWhole')
            .min(50, 'heightRange')
            .max(300, 'heightRange')
            .optional(),
    ),
})

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
