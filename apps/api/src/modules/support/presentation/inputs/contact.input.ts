import { Field, InputType } from '@nestjs/graphql'
import { z } from 'zod'

import { TICKET_CATEGORIES } from '../../domain/ticket-category'

/** GraphQL shape for `sendContactMessage`. Validation lives in `contactSchema`. */
@InputType()
export class ContactInput {
    @Field()
    email!: string

    @Field(() => String, { nullable: true, description: 'The sender’s name, if given.' })
    name?: string | null

    @Field({ description: 'One of: general, billing, bug, account, feature, other.' })
    category!: string

    @Field()
    subject!: string

    @Field()
    message!: string

    @Field(() => String, {
        nullable: true,
        description: 'Honeypot — real users leave it empty; a filled value is dropped as spam.',
    })
    website?: string | null
}

export const contactSchema = z.object({
    email: z.email(),
    name: z.string().trim().min(1).max(80).nullish(),
    category: z.enum(TICKET_CATEGORIES),
    subject: z.string().trim().min(3).max(150),
    message: z.string().trim().min(10).max(5000),
    // Honeypot: accepted but not constrained — the resolver drops any filled value.
    website: z.string().optional(),
})
