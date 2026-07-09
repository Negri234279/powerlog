import type { AiProviderVO } from '../value-objects/ai-provider.vo'
import type { EncryptedSecretVO } from '../value-objects/encrypted-secret.vo'

export interface AiProviderConfigProps {
    /** Identity, first half: the owning auth user (soft reference, no FK). */
    userId: string
    /** Identity, second half: one configuration per user *and* provider. */
    provider: AiProviderVO
    encryptedKey: EncryptedSecretVO
    /** Last four characters of the key — the only part ever shown back. */
    keyLast4: string
    /** Chosen model id; null → the user has not picked one yet. */
    model: string | null
    /** Lets the user park a key without it being used. */
    enabled: boolean
    createdAt: Date
    updatedAt: Date
}

/**
 * `AiProviderConfigAggregate` — one user's BYOK configuration for one provider.
 * A user may hold one of each (OpenAI *and* Anthropic), so identity is the
 * `(userId, provider)` pair rather than a surrogate id.
 *
 * Aggregate root without domain events (nothing consumes them), so it does not
 * extend `AggregateRoot` — same call as `ProfileAggregate`.
 *
 * The API key only ever lives here encrypted. Replacing it always replaces
 * `keyLast4` too, so the masked hint can never drift from the stored secret.
 */
export class AiProviderConfigAggregate {
    private constructor(private readonly props: AiProviderConfigProps) {}

    static create(input: {
        userId: string
        provider: AiProviderVO
        encryptedKey: EncryptedSecretVO
        keyLast4: string
        model?: string | null
        now: Date
    }): AiProviderConfigAggregate {
        return new AiProviderConfigAggregate({
            userId: input.userId,
            provider: input.provider,
            encryptedKey: input.encryptedKey,
            keyLast4: input.keyLast4,
            model: input.model ?? null,
            enabled: true,
            createdAt: input.now,
            updatedAt: input.now,
        })
    }

    static rehydrate(props: AiProviderConfigProps): AiProviderConfigAggregate {
        return new AiProviderConfigAggregate(props)
    }

    /** Swap in a freshly encrypted key. The masked hint moves with it. */
    replaceKey(encryptedKey: EncryptedSecretVO, keyLast4: string, now: Date): void {
        this.props.encryptedKey = encryptedKey
        this.props.keyLast4 = keyLast4
        this.props.updatedAt = now
    }

    /** Pick a model, or `null` to go back to having none selected. */
    setModel(model: string | null, now: Date): void {
        this.props.model = model
        this.props.updatedAt = now
    }

    setEnabled(enabled: boolean, now: Date): void {
        if (this.props.enabled === enabled) return

        this.props.enabled = enabled
        this.props.updatedAt = now
    }

    get userId(): string {
        return this.props.userId
    }
    get provider(): AiProviderVO {
        return this.props.provider
    }
    get encryptedKey(): EncryptedSecretVO {
        return this.props.encryptedKey
    }
    get keyLast4(): string {
        return this.props.keyLast4
    }
    get model(): string | null {
        return this.props.model
    }
    get enabled(): boolean {
        return this.props.enabled
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
    get updatedAt(): Date {
        return this.props.updatedAt
    }
}
