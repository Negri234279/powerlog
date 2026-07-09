import { Field, InputType } from '@nestjs/graphql'
import { z } from 'zod'

import { aiProviderSchema, apiKeySchema, modelSchema } from './ai-provider.schema'

@InputType()
export class SetAiProviderKeyInput {
    @Field(() => String, { description: '"openai" or "anthropic".' })
    provider!: string

    @Field(() => String, { description: 'The provider API key. Stored encrypted; never returned.' })
    apiKey!: string

    @Field(() => String, { nullable: true, description: 'Model to select; must be callable with this key.' })
    model?: string | null
}

export const setAiProviderKeySchema = z.object({
    provider: aiProviderSchema,
    apiKey: apiKeySchema,
    model: modelSchema.nullable().optional(),
})
