import { Field, ID, InputType } from '@nestjs/graphql'
import { z } from 'zod'

const role = z.enum(['athlete', 'coach'])
const status = z.enum(['active', 'disabled', 'deleted'])

// ── list args ───────────────────────────────────────────────────────────
// GraphQL passes an explicit `null` for an omitted nullable arg, so accept null
// (and undefined) and normalise both to "no filter".
const optionalArg = <T extends z.ZodTypeAny>(schema: T) => schema.nullish().transform((v) => v ?? undefined)

export const rolesArg = optionalArg(z.array(role))
export const statusesArg = optionalArg(z.array(status))
// Slugs, not an enum: the plan catalog is admin-editable, so what is valid is a
// runtime question. An unknown slug matches nobody rather than being rejected.
export const plansArg = optionalArg(z.array(z.string().trim().min(1).max(80)))
export const isAdminArg = optionalArg(z.boolean())
export const verifiedArg = optionalArg(z.boolean())
export const searchArg = optionalArg(z.string().trim().min(1).max(100))
export const limitArg = optionalArg(z.coerce.number().int().min(1).max(100))
export const offsetArg = optionalArg(z.coerce.number().int().min(0))

// ── set role ────────────────────────────────────────────────────────────
@InputType()
export class SetUserRoleInput {
    @Field(() => ID)
    userId!: string

    @Field(() => String, { description: '"athlete" or "coach".' })
    role!: string
}

export const setUserRoleSchema = z.object({
    userId: z.string().uuid(),
    role,
})

// ── set admin ───────────────────────────────────────────────────────────
@InputType()
export class SetUserAdminInput {
    @Field(() => ID)
    userId!: string

    @Field()
    isAdmin!: boolean
}

export const setUserAdminSchema = z.object({
    userId: z.string().uuid(),
    isAdmin: z.boolean(),
})

// ── set status (disable / enable) ───────────────────────────────────────
@InputType()
export class SetUserStatusInput {
    @Field(() => ID)
    userId!: string

    @Field({ description: 'true → disable (suspend) the account; false → re-enable.' })
    disabled!: boolean
}

export const setUserStatusSchema = z.object({
    userId: z.string().uuid(),
    disabled: z.boolean(),
})
