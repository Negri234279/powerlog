import { describe, expect, it } from 'vitest'

import { categoriesArg, searchArg, statusesArg } from './admin-support.inputs'

/**
 * The web client sends an explicit `null` for an absent filter (graphql-request
 * serializes an `undefined` variable as `null`). These args must accept that and
 * normalize it to `undefined` — `.optional()` alone rejects `null`, which surfaced
 * as a BAD_REQUEST and an empty admin inbox.
 */
describe('admin-support optional args', () => {
    it.each([
        ['statusesArg', statusesArg],
        ['categoriesArg', categoriesArg],
        ['searchArg', searchArg],
    ])('%s accepts null and normalizes it to undefined', (_name, arg) => {
        const result = arg.safeParse(null)

        expect(result.success).toBe(true)
        expect(result.data).toBeUndefined()
    })

    it('statusesArg still validates the enum members', () => {
        expect(statusesArg.safeParse(['open', 'closed']).success).toBe(true)
        expect(statusesArg.safeParse(['nope']).success).toBe(false)
    })
})
