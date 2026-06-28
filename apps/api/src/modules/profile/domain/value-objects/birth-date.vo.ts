import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidBirthDateError } from '../errors/profile.errors'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Calendar birth date as a canonical `YYYY-MM-DD` string (no time/zone, to dodge
 * off-by-one TZ bugs). Validates it's a real date with a sane year; the
 * "not in the future" rule needs `now`, so it's enforced by the aggregate.
 */
export class BirthDateVO extends ValueObject<string> {
    static create(raw: string): BirthDateVO {
        return new BirthDateVO(raw.trim())
    }

    /** Midnight-UTC Date for age/comparison math. */
    toDate(): Date {
        return new Date(`${this.value}T00:00:00.000Z`)
    }

    override equals(other: BirthDateVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: string): void {
        if (!ISO_DATE.test(value)) {
            throw new InvalidBirthDateError()
        }
        const date = new Date(`${value}T00:00:00.000Z`)
        // Round-trip guard rejects impossible dates like 2026-02-31.
        if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
            throw new InvalidBirthDateError()
        }
        const year = date.getUTCFullYear()
        if (year < 1900 || year > 2100) {
            throw new InvalidBirthDateError()
        }
    }
}
