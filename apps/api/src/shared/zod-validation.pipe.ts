import { BadRequestException, type PipeTransform } from '@nestjs/common'
import type { ZodType } from 'zod'

/**
 * Validates a resolver/controller argument against a zod schema (zod is our
 * external-input validator — no class-validator). Returns the parsed value or
 * throws a 400 with a readable list of issues.
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
    constructor(private readonly schema: ZodType<T>) {}

    transform(value: unknown): T {
        const result = this.schema.safeParse(value)
        if (!result.success) {
            const issues = result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')
            throw new BadRequestException(`Validation failed: ${issues}`)
        }
        return result.data
    }
}
