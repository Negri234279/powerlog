import { Field, InputType, Int } from '@nestjs/graphql'
import { z } from 'zod'

/** GraphQL shape for `register`. Business validation lives in `registerSchema`. */
@InputType()
export class RegisterInput {
    @Field()
    email!: string

    @Field()
    password!: string

    @Field({ description: 'Public handle: 3–30 chars of a–z, 0–9 or underscore.' })
    username!: string

    @Field({ nullable: true, description: '"kg" (default) or "lb".' })
    units?: string

    // ── Optional profile details (provisioned with the account) ──
    @Field(() => String, { nullable: true })
    firstName?: string | null

    @Field(() => String, { nullable: true })
    lastName?: string | null

    @Field(() => String, { nullable: true, description: 'Birth date as YYYY-MM-DD.' })
    birthDate?: string | null

    @Field(() => Int, { nullable: true, description: 'Height in centimetres (50–300).' })
    heightCm?: number | null
}

export const registerSchema = z.object({
    email: z.email(),
    password: z.string().min(8).max(200),
    // Case-insensitive here; the UsernameVO lowercases to its canonical form.
    username: z
        .string()
        .trim()
        .min(3)
        .max(30)
        .regex(/^[a-z0-9_]+$/i, 'Username may use a–z, 0–9 and underscore.'),
    units: z.enum(['kg', 'lb']).optional(),
    // Optional profile fields; mirror the profile VOs so they fail fast here.
    firstName: z.string().trim().min(1).max(60).nullish(),
    lastName: z.string().trim().min(1).max(60).nullish(),
    birthDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD.')
        .nullish(),
    heightCm: z.number().int().min(50).max(300).nullish(),
})
