import { z } from 'zod'

import { TICKET_CATEGORIES } from '../../domain/ticket-category'
import { TICKET_STATUSES } from '../../domain/ticket-status'

/** Default page size for the admin ticket inbox. */
export const DEFAULT_LIMIT = 50

export const uuidArg = z.uuid()
export const statusesArg = z.array(z.enum(TICKET_STATUSES)).optional()
export const categoriesArg = z.array(z.enum(TICKET_CATEGORIES)).optional()
export const searchArg = z.string().trim().min(1).max(120).optional()
export const limitArg = z.coerce.number().int().min(1).max(100).optional()
export const offsetArg = z.coerce.number().int().min(0).optional()
/** Required status for the close/reopen mutation. */
export const setStatusArg = z.enum(TICKET_STATUSES)
