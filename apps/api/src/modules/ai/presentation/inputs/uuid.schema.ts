import { z } from 'zod'

/** Validates a bare id argument. Shared by the resolvers that take one. */
export const uuidSchema = z.uuid()

/** Same, for an argument that may be omitted (e.g. "whose draft?"). */
export const optionalUuidSchema = z.uuid().optional()
