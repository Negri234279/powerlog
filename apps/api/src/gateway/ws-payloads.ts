import { z } from 'zod'

/**
 * zod schemas for the client→server WS events. A socket payload is external input
 * exactly like a GraphQL arg, so it's validated before a command is built. The
 * body cap mirrors the GraphQL resolver's DoS guard; the domain VO owns the real
 * empty/length rules.
 */
export const joinPayloadSchema = z.object({ conversationId: z.string().uuid() })
export const typingPayloadSchema = z.object({ conversationId: z.string().uuid() })
export const cursorAckPayloadSchema = z.object({ conversationId: z.string().uuid() })
export const sendPayloadSchema = z.object({
    conversationId: z.string().uuid(),
    body: z.string().max(10_000),
})

export type JoinPayload = z.infer<typeof joinPayloadSchema>
export type SendPayload = z.infer<typeof sendPayloadSchema>
