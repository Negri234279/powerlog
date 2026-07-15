import { Field, ID, InputType, Int } from '@nestjs/graphql'
import { z } from 'zod'

import { JsonValue } from '../../../../graphql/json.scalar'
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from '../../../../shared/i18n/locale'

// Base name/description (default locale) live on the plan row; translations cover
// only the other supported locales.
const NON_DEFAULT_LOCALES = SUPPORTED_LOCALES.filter((locale) => locale !== DEFAULT_LOCALE)

const planTranslation = z.object({
    locale: z.enum(NON_DEFAULT_LOCALES as [SupportedLocale, ...SupportedLocale[]]),
    name: z.string().trim().min(1).max(60),
    description: z
        .string()
        .trim()
        .max(500)
        .nullish()
        .transform((value) => value ?? null),
})

/** GraphQL shape for a single localized name/description the admin form submits. */
@InputType()
export class PlanTranslationInput {
    @Field(() => String, { description: 'A non-default supported locale, e.g. "es".' })
    locale!: string

    @Field()
    name!: string

    @Field(() => String, { nullable: true })
    description?: string | null
}

const audience = z.enum(['athlete', 'coach'])
const status = z.enum(['draft', 'active', 'archived'])
const interval = z.enum(['month', 'quarter', 'semester', 'year'])
const currency = z.enum(['EUR', 'USD'])
const subscriptionStatus = z.enum(['incomplete', 'trialing', 'active', 'past_due', 'canceled', 'expired'])
const gateway = z.enum(['stripe', 'paypal', 'manual'])
const uuid = z.string().uuid()
const slug = z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Lowercase letters, digits and single hyphens.')
    .min(3)
    .max(40)

/**
 * `entitlements` is deliberately `unknown` here: its real schema depends on the
 * plan's audience and lives in the domain (`planEntitlementsFor`), which is the
 * single place that decides what a plan may grant. Validating a shape here too
 * would be a second definition to keep in step.
 */
const entitlements = z.unknown()

// ── create plan ─────────────────────────────────────────────────────────
@InputType()
export class CreatePlanInput {
    @Field(() => String, { description: 'athlete | coach — decides the shape of the entitlements.' })
    audience!: string

    @Field(() => String, { description: 'Stable public id (e.g. athlete-pro). Immutable afterwards.' })
    slug!: string

    @Field()
    name!: string

    @Field(() => String, { nullable: true })
    description?: string | null

    @Field(() => JsonValue, { description: 'Validated against the zod schema of the audience.' })
    entitlements!: unknown

    @Field(() => String, { nullable: true, description: 'draft (default) | active | archived' })
    status?: string | null

    @Field(() => Boolean, {
        nullable: true,
        description: 'The audience fallback. At most one active free plan per audience.',
    })
    isFree?: boolean | null

    @Field(() => Int, { nullable: true })
    sortOrder?: number | null

    @Field(() => [PlanTranslationInput], { nullable: true, description: 'Name/description in non-default locales.' })
    translations?: PlanTranslationInput[] | null
}

export const createPlanSchema = z.object({
    audience,
    slug,
    name: z.string().trim().min(1).max(60),
    description: z
        .string()
        .trim()
        .max(500)
        .nullish()
        .transform((value) => value ?? null),
    entitlements,
    status: status.nullish().transform((value) => value ?? 'draft'),
    isFree: z
        .boolean()
        .nullish()
        .transform((value) => value ?? false),
    sortOrder: z
        .int()
        .min(0)
        .max(999)
        .nullish()
        .transform((value) => value ?? 0),
    translations: z
        .array(planTranslation)
        .max(NON_DEFAULT_LOCALES.length)
        .nullish()
        .transform((value) => value ?? []),
})

// ── update plan ─────────────────────────────────────────────────────────
@InputType()
export class UpdatePlanInput {
    @Field(() => ID)
    id!: string

    @Field(() => String, { nullable: true })
    name?: string | null

    @Field(() => String, { nullable: true, description: 'Pass null to clear it.' })
    description?: string | null

    @Field(() => JsonValue, { nullable: true, description: 'Editing these reaches live subscribers immediately.' })
    entitlements?: unknown

    @Field(() => Int, { nullable: true })
    sortOrder?: number | null

    @Field(() => [PlanTranslationInput], {
        nullable: true,
        description: 'Absent leaves translations alone; present replaces the whole set.',
    })
    translations?: PlanTranslationInput[] | null
}

/**
 * A patch: an absent key is left alone. `description` is the one field where an
 * explicit null means "clear it", so it is kept (nullable, not nullish-stripped).
 * `translations`, when present, replaces the whole set.
 */
export const updatePlanSchema = z.object({
    id: uuid,
    name: z.string().trim().min(1).max(60).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    entitlements: entitlements.optional(),
    sortOrder: z.int().min(0).max(999).optional(),
    translations: z.array(planTranslation).max(NON_DEFAULT_LOCALES.length).optional(),
})

// ── plan status ─────────────────────────────────────────────────────────
export const planStatusArg = status

// ── prices ──────────────────────────────────────────────────────────────
@InputType()
export class AddPlanPriceInput {
    @Field(() => ID)
    planId!: string

    @Field(() => String, { description: 'month | quarter | semester | year' })
    interval!: string

    @Field(() => String, { description: 'EUR | USD' })
    currency!: string

    @Field(() => Int, { description: 'Integer cents. Replaces the version on sale for this combo.' })
    amountCents!: number
}

export const addPlanPriceSchema = z.object({
    planId: uuid,
    interval,
    currency,
    // 500 € / 50.000 cents is far above any plausible plan: a stray extra zero is a
    // mistake worth catching before it reaches a payment gateway.
    amountCents: z.int().min(1).max(100_000),
})

// ── manual grant ────────────────────────────────────────────────────────
@InputType()
export class AssignSubscriptionInput {
    @Field(() => ID)
    userId!: string

    @Field(() => ID)
    planId!: string

    @Field(() => Date, { nullable: true, description: 'When the grant ends. Omitted → one year.' })
    until?: Date | null
}

export const assignSubscriptionSchema = z.object({
    userId: uuid,
    planId: uuid,
    until: z.coerce
        .date()
        .nullish()
        .transform((value) => value ?? null),
})

// ── offers ──────────────────────────────────────────────────────────────
@InputType()
export class IntroPhaseInput {
    @Field(() => Int, { description: 'How many billing cycles the discount lasts.' })
    cycles!: number

    @Field(() => Int, { description: 'How much is taken off each of those cycles (1–100).' })
    percentOff!: number
}

@InputType()
export class UpsertPlanOfferInput {
    @Field(() => ID)
    planId!: string

    @Field()
    name!: string

    @Field(() => Int, { nullable: true, description: 'Free days before the first charge.' })
    trialDays?: number | null

    @Field(() => IntroPhaseInput, { nullable: true })
    introPhase?: IntroPhaseInput | null

    @Field(() => Date, { nullable: true, description: 'When it opens. Omitted → now.' })
    startsAt?: Date | null

    @Field(() => Date, { nullable: true, description: 'When it closes. Omitted → open-ended.' })
    endsAt?: Date | null
}

export const upsertPlanOfferSchema = z.object({
    planId: uuid,
    name: z.string().trim().min(1).max(60),
    trialDays: z.int().min(1).max(365).nullish(),
    introPhase: z.object({ cycles: z.int().min(1).max(36), percentOff: z.int().min(1).max(100) }).nullish(),
    startsAt: z.coerce.date().nullish(),
    endsAt: z.coerce.date().nullish(),
})

// ── gateways ────────────────────────────────────────────────────────────
export const gatewayArgRequired = gateway
const webhookStatus = z.enum(['received', 'processed', 'failed'])

// ── list filters ────────────────────────────────────────────────────────
const optionalArg = <T extends z.ZodTypeAny>(schema: T) => schema.nullish().transform((value) => value ?? undefined)

export const audienceArg = optionalArg(audience)
export const idArg = optionalArg(uuid)
export const statusArg = optionalArg(subscriptionStatus)
export const gatewayArg = optionalArg(gateway)
export const searchArg = optionalArg(z.string().trim().min(1).max(120))
export const limitArg = optionalArg(z.coerce.number().int().min(1).max(100))
export const offsetArg = optionalArg(z.coerce.number().int().min(0))
export const webhookStatusArg = optionalArg(webhookStatus)
export const uuidArg = uuid
