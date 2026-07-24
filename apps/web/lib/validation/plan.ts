import { z } from 'zod'

/**
 * The "new plan" form. Validation messages are stable keys under the `admin` i18n
 * namespace (e.g. `planNameRequired`), translated at render with `t(key)` — mirrors
 * how the auth forms validate. The prices/free rule spans fields, so it's a refinement
 * that reports on the `prices` path.
 */
export const planCreateSchema = z
    .object({
        name: z.string().trim().min(1, 'planNameRequired'),
        slug: z
            .string()
            .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'planSlugInvalid')
            .min(3, 'planSlugInvalid'),
        free: z.boolean(),
        // The interval×currency draft, amounts as typed (major units). The keys don't
        // matter to validation — only that at least one cell holds a valid amount.
        prices: z.record(z.string(), z.string()),
    })
    .superRefine((value, ctx) => {
        // A plan explicitly marked free needs no prices.
        if (value.free) return

        const filled = Object.values(value.prices)
            .map((raw) => raw.trim())
            .filter((raw) => raw !== '')

        // A paid plan with nothing filled is almost always a forgotten price, not an
        // intended free plan — make the admin tick "Free plan" to mean that.
        if (filled.length === 0) {
            ctx.addIssue({ code: 'custom', path: ['prices'], message: 'planNeedsPrice' })
            return
        }
        // A cell below one cent (or non-numeric) is a typo, not a price.
        if (filled.some((raw) => !Number.isFinite(Number(raw)) || Math.round(Number(raw) * 100) < 1)) {
            ctx.addIssue({ code: 'custom', path: ['prices'], message: 'planPriceInvalid' })
        }
    })

export type PlanCreateValues = z.infer<typeof planCreateSchema>
