import type { AdminPlan, PlanTranslationInput, UpsertPlanOfferInput } from '@/lib/graphql/hooks/use-admin-billing'

// The plan catalog's shared vocabulary — the intervals/currencies a price can take,
// the lifecycle statuses, and the non-default locales a plan can be translated into.
// The base name/description are the default (English) and the fallback.
export const INTERVALS = ['month', 'quarter', 'semester', 'year'] as const
export const CURRENCIES = ['EUR', 'USD'] as const
export const STATUSES = ['draft', 'active', 'archived'] as const
export const TRANSLATION_LOCALES = ['es'] as const

export type TranslationDraft = Record<string, { name: string; description: string }>

/** Cents → what an admin reads. The API only ever deals in integer cents. */
export function formatAmount(amountCents: number, currency: string, locale: string): string {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amountCents / 100)
}

/** The seeded translation drafts: what's saved for each non-default locale, else empty. */
export function seedTranslations(initial?: AdminPlan): TranslationDraft {
    const seed: TranslationDraft = {}

    for (const locale of TRANSLATION_LOCALES) {
        const saved = initial?.translations.find((translation) => translation.locale === locale)

        seed[locale] = {
            name: saved?.name ?? '',
            description: saved?.description ?? '',
        }
    }

    return seed
}

/** The drafts as the API's translations input — a locale with no name is dropped so it
 *  falls back to the base. */
export function translationPayload(draft: TranslationDraft): PlanTranslationInput[] {
    return TRANSLATION_LOCALES.flatMap((locale) => {
        const entry = draft[locale]
        if (!entry?.name.trim()) return []

        return [{ locale, name: entry.name.trim(), description: entry.description.trim() || null }]
    })
}

/** The prices filled into a matrix draft, as publishable rows (empty cells skipped). */
export function filledPrices(
    draft: Record<string, string>,
): { interval: string; currency: string; amountCents: number }[] {
    const rows: { interval: string; currency: string; amountCents: number }[] = []

    for (const interval of INTERVALS)
        for (const currency of CURRENCIES) {
            const raw = (draft[`${interval}-${currency}`] ?? '').trim()
            if (raw === '') continue

            rows.push({ interval, currency, amountCents: Math.round(Number(raw) * 100) })
        }

    return rows
}

/** True if any non-empty cell isn't a valid amount above zero. */
export function hasInvalidAmount(draft: Record<string, string>): boolean {
    for (const interval of INTERVALS)
        for (const currency of CURRENCIES) {
            const raw = (draft[`${interval}-${currency}`] ?? '').trim()
            if (raw === '') continue
            if (!Number.isFinite(Number(raw)) || Math.round(Number(raw) * 100) < 1) return true
        }

    return false
}

/** An ISO timestamp as the `yyyy-mm-dd` a `<input type="date">` wants, or empty. */
export function toDateInput(iso: string | null | undefined): string {
    return iso ? iso.slice(0, 10) : ''
}

/** The offer form's raw string state — one shape shared by the create draft and the edit panel. */
export type OfferDraft = {
    name: string
    message: string
    trialDays: string
    percentOff: string
    cycles: string
    startsAt: string
    endsAt: string
}

/** Seed a draft from a saved offer (edit) or empty (create); the name defaults so it's never blank. */
export function seedOfferDraft(offer: AdminPlan['offer'], defaultName: string): OfferDraft {
    return {
        name: offer?.name ?? defaultName,
        message: offer?.message ?? '',
        trialDays: offer?.trialDays ? String(offer.trialDays) : '',
        percentOff: offer?.introPhase ? String(offer.introPhase.percentOff) : '',
        cycles: offer?.introPhase ? String(offer.introPhase.cycles) : '',
        startsAt: toDateInput(offer?.startsAt),
        endsAt: toDateInput(offer?.endsAt),
    }
}

/** True if the admin filled anything beyond the pre-seeded name — i.e. an offer is intended. */
export function offerDraftTouched(draft: OfferDraft): boolean {
    return [draft.message, draft.trialDays, draft.percentOff, draft.cycles, draft.startsAt, draft.endsAt].some(
        (value) => value.trim() !== '',
    )
}

/**
 * The offer's shape rules, as a message key or null. An offer must grant something (trial
 * and/or intro discount), and an intro phase needs both halves — the API refuses otherwise.
 */
export function validateOfferDraft(draft: OfferDraft): 'offerNeedsSomething' | 'offerDiscountIncomplete' | null {
    const hasTrial = draft.trialDays.trim() !== ''
    const hasIntroField = draft.percentOff.trim() !== '' || draft.cycles.trim() !== ''

    if (!hasTrial && !hasIntroField) return 'offerNeedsSomething'
    if (hasIntroField && (draft.percentOff.trim() === '' || draft.cycles.trim() === ''))
        return 'offerDiscountIncomplete'

    return null
}

/** A validated draft as the upsert input (the cents/ISO shaping the API wants). */
export function offerInputFrom(planId: string, draft: OfferDraft): UpsertPlanOfferInput {
    const hasTrial = draft.trialDays.trim() !== ''
    const hasIntro = draft.percentOff.trim() !== '' || draft.cycles.trim() !== ''

    return {
        planId,
        name: draft.name.trim(),
        message: draft.message.trim() || null,
        trialDays: hasTrial ? Number(draft.trialDays) : null,
        introPhase: hasIntro ? { cycles: Number(draft.cycles), percentOff: Number(draft.percentOff) } : null,
        startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : null,
        endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : null,
    }
}
