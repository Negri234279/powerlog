import type { AiTaskKind } from '../../../domain/entities/ai-provider-config.entity'

/**
 * Pick the model to run one AI task on for a configured provider (IA.8), or clear
 * it to fall back to the provider's default model.
 */
export class SetAiProviderTaskModelCommand {
    constructor(
        public readonly userId: string,
        public readonly provider: string,
        public readonly kind: AiTaskKind,
        /** `null` clears the per-task choice. */
        public readonly model: string | null,
    ) {}
}
