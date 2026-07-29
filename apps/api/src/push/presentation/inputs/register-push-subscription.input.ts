import { Field, InputType } from '@nestjs/graphql'
import { z } from 'zod'

/** GraphQL shape for `registerPushSubscription` — a browser PushSubscription. */
@InputType()
export class RegisterPushSubscriptionInput {
    @Field({ description: 'The push service URL the browser issued for this subscription.' })
    endpoint!: string

    @Field({ description: "The subscription's p256dh public key (base64url)." })
    p256dh!: string

    @Field({ description: "The subscription's auth secret (base64url)." })
    auth!: string

    @Field({ nullable: true, description: 'UI locale, for localising the notification text (defaults to en).' })
    locale?: string

    @Field({ nullable: true, description: 'User-agent string, for a future "your devices" view.' })
    userAgent?: string
}

export const registerPushSubscriptionSchema = z.object({
    endpoint: z.url().max(2000),
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
    locale: z.enum(['es', 'en']).optional(),
    userAgent: z.string().max(500).optional(),
})
