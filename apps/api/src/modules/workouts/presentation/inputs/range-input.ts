import { z } from 'zod'

export const RANGE_DESCRIPTION = 'A number or a range: "5" or "5-8".'

/**
 * A planned target in the range notation. Only the outer envelope is checked
 * here — that it is a short, non-empty string. The shape itself (`5`, `5-8`) and
 * the bounds are the domain's rule, so `RangeVO` stays the single authority and
 * there is no second regex to drift out of step with it.
 */
export const rangeText = z.string().trim().min(1).max(20).nullable().optional()
