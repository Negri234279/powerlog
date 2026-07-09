import { z } from 'zod'

import { AI_PROVIDERS } from '../../../../shared/ai-provider'

/** Validates the `provider` argument at the edge, before it reaches the domain. */
export const aiProviderSchema = z.enum(AI_PROVIDERS)

/**
 * Shape-only bounds on the raw key, mirroring `ApiKeyVO`. Whether the key is
 * *real* is decided by the provider, not by a regex.
 */
export const apiKeySchema = z.string().trim().min(20).max(512)

/** A provider model id, e.g. "gpt-5" or "claude-opus-4-8". */
export const modelSchema = z.string().trim().min(1).max(200)
