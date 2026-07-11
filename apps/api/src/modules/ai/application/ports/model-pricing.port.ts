import type { AiProvider } from '../../../../shared/ai-provider'
import type { ModelPrice } from '../../domain/pricing/model-price'

/**
 * Resolves a (provider, model) to its per-token price. A port, not a constant,
 * because the source is a policy decision: today a static table (the providers
 * do not expose prices via API), tomorrow a fetched catalog — callers don't care.
 *
 * Returns `null` for a model with no known price, so usage is still metered in
 * tokens and the cost is shown as "—" rather than a fabricated figure.
 */
export abstract class ModelPricing {
    abstract priceFor(provider: AiProvider, model: string): ModelPrice | null
}
