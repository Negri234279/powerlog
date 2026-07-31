import { KNOWN_MODEL_IDS } from './static-model-pricing'

/** Anything not on the allowlist collapses here, so the label stays bounded. */
const UNKNOWN_MODEL = 'other'

/**
 * Fold a raw model id onto the bounded allowlist for use as a metric label.
 * BYOK lets a user name any model their key can reach, so the raw id is
 * unbounded-cardinality and cannot be a label as-is.
 *
 * A date-suffixed or aliased id (`claude-opus-4-8-20260528`) normalises to the
 * longest known id it starts with — the same prefix rule `StaticModelPricing`
 * uses to price it — and everything unrecognised becomes `other`.
 */
export function normalizeModelLabel(model: string): string {
    const canonical = KNOWN_MODEL_IDS.filter((id) => model === id || model.startsWith(id)).sort(
        (a, b) => b.length - a.length,
    )[0]

    return canonical ?? UNKNOWN_MODEL
}
