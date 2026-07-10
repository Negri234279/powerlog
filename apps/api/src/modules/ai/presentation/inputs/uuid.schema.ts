import { z } from 'zod'

/** Validates a bare id argument. Shared by the resolvers that take one. */
export const uuidSchema = z.uuid()
