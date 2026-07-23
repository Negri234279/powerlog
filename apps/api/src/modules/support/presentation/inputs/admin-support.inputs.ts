import { z } from 'zod'

import { TICKET_CATEGORIES } from '../../domain/ticket-category'
import { TICKET_STATUSES } from '../../domain/ticket-status'

/** Default page size for the admin ticket inbox. */
export const DEFAULT_LIMIT = 50

/**
 * A nullable/optional GraphQL arg. The client sends an explicit `null` for an
 * absent filter (graphql-request serializes `undefined` variables as `null`), and
 * `.optional()` alone rejects `null` — so accept both and normalize to `undefined`.
 * Mirrors billing's `optionalArg`.
 */
const optionalArg = <T extends z.ZodTypeAny>(schema: T) => schema.nullish().transform((value) => value ?? undefined)

export const uuidArg = z.uuid()
export const statusesArg = optionalArg(z.array(z.enum(TICKET_STATUSES)))
export const categoriesArg = optionalArg(z.array(z.enum(TICKET_CATEGORIES)))
export const searchArg = optionalArg(z.string().trim().min(1).max(120))
export const limitArg = optionalArg(z.coerce.number().int().min(1).max(100))
export const offsetArg = optionalArg(z.coerce.number().int().min(0))
/** Required status for the close/reopen mutation. */
export const setStatusArg = z.enum(TICKET_STATUSES)
