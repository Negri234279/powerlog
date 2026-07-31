import { sql } from 'drizzle-orm'
import { boolean, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

import { AI_PROVIDERS } from '../../../../../shared/ai-provider'

export const aiProviderEnum = pgEnum('ai_provider', AI_PROVIDERS)

/**
 * `ai_provider_configs` — one row per (user, provider). A user can hold an
 * OpenAI key and an Anthropic key at once, hence the composite primary key
 * rather than a surrogate id.
 *
 * The link to `users` is a SOFT reference (no DB foreign key): a real FK would
 * force this file to import the auth module's schema, crossing a module
 * boundary. Erasure on account deletion is driven by an integration event.
 *
 * The key is stored encrypted (AES-256-GCM): `ciphertext` + the per-row `iv` and
 * `auth_tag` needed to decrypt and verify it. `key_last4` is the only part ever
 * readable by the client.
 */
export const aiProviderConfigs = pgTable(
    'ai_provider_configs',
    {
        userId: uuid('user_id').notNull(),
        provider: aiProviderEnum('provider').notNull(),
        ciphertext: text('ciphertext').notNull(),
        iv: text('iv').notNull(),
        authTag: text('auth_tag').notNull(),
        keyLast4: text('key_last4').notNull(),
        // Chosen model id (provider-specific, e.g. "claude-opus-4-8"); null → none picked.
        model: text('model'),
        // Per-task model overrides (IA.8); null → fall back to `model`. Additive: an
        // existing config has both null and behaves exactly as before.
        mesocycleModel: text('mesocycle_model'),
        sessionPlanModel: text('session_plan_model'),
        enabled: boolean('enabled').notNull().default(true),
        // The provider the AI features reach for when the user has configured more
        // than one. At most one per user — enforced below, in the database.
        isDefault: boolean('is_default').notNull().default(false),
        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        primaryKey({ columns: [table.userId, table.provider] }),
        // A partial unique index: only the rows where is_default is true take part,
        // so a user can hold many providers but never two defaults. The application
        // clears the old default in the same transaction; this is the backstop.
        uniqueIndex('ai_provider_configs_one_default_per_user')
            .on(table.userId)
            .where(sql`${table.isDefault}`),
    ],
)
