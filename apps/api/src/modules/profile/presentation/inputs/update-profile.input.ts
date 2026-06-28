import { Field, InputType, Int } from '@nestjs/graphql'
import { z } from 'zod'

/**
 * GraphQL input for `updateProfile`. Every field is optional: omit to leave
 * unchanged, send `null` to clear (except displayName, which is required-when-
 * present). Business validation lives in `updateProfileSchema` + the VOs.
 * Nullable string fields need an explicit type — a `string | null` union can't
 * be inferred from reflection metadata.
 */
@InputType()
export class UpdateProfileInput {
    @Field(() => String, { nullable: true })
    displayName?: string

    @Field(() => String, { nullable: true })
    firstName?: string | null

    @Field(() => String, { nullable: true })
    lastName?: string | null

    @Field(() => String, { nullable: true, description: 'Birth date as YYYY-MM-DD.' })
    birthDate?: string | null

    @Field(() => String, { nullable: true, description: '"male" or "female".' })
    sex?: string | null

    @Field(() => Int, { nullable: true, description: 'Height in centimetres (50–300).' })
    heightCm?: number | null

    @Field(() => String, { nullable: true })
    bio?: string | null

    @Field(() => String, { nullable: true, description: 'ISO 3166-1 alpha-2 country code.' })
    country?: string | null

    @Field(() => String, { nullable: true, description: 'IANA timezone, e.g. "Europe/Madrid".' })
    timezone?: string | null

    @Field(() => String, { nullable: true, description: 'BCP 47 locale, e.g. "es-ES".' })
    locale?: string | null
}

export const updateProfileSchema = z.object({
    // The display name IS the public handle (kept in sync with users.username),
    // so it follows the username rules, not free text.
    displayName: z
        .string()
        .trim()
        .toLowerCase()
        .min(3)
        .max(30)
        .regex(/^[a-z0-9_]+$/i, 'Use 3–30 chars: a–z, 0–9 or underscore.')
        .optional(),
    firstName: z.string().trim().min(1).max(60).nullable().optional(),
    lastName: z.string().trim().min(1).max(60).nullable().optional(),
    birthDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD.')
        .nullable()
        .optional(),
    sex: z.enum(['male', 'female']).nullable().optional(),
    heightCm: z.number().int().min(50).max(300).nullable().optional(),
    bio: z.string().trim().max(1000).nullable().optional(),
    country: z.string().trim().length(2).toUpperCase().nullable().optional(),
    timezone: z.string().trim().min(1).max(64).nullable().optional(),
    locale: z.string().trim().min(2).max(10).nullable().optional(),
})
