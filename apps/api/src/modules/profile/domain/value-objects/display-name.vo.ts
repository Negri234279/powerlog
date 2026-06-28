import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidDisplayNameError } from '../errors/profile.errors'

const MIN_LENGTH = 3
const MAX_LENGTH = 30
const HANDLE_RE = /^[a-z0-9_]{3,30}$/

/**
 * Public handle (required). It doubles as the user's display name AND their
 * unique public handle, so it follows handle rules: lowercase `a–z`, `0–9` and
 * `_`, length 3–30. `create` normalizes (trim + lowercase) then validates, so
 * any `DisplayNameVO` is already canonical. Uniqueness is enforced in persistence.
 */
export class DisplayNameVO extends ValueObject<string> {
    static create(raw: string): DisplayNameVO {
        return new DisplayNameVO(raw.trim().toLowerCase())
    }

    /**
     * Turn an arbitrary seed (e.g. an email local-part or a Google display name)
     * into a valid handle base: lowercase, non-`[a-z0-9_]` runs collapsed to `_`,
     * trimmed of edge underscores, padded/truncated into the 3–30 range. Falls
     * back to `user` when nothing usable remains. The result always satisfies
     * `create`, so callers can append a numeric suffix safely.
     */
    static slugify(seed: string): string {
        let slug = seed
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_]+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '')

        if (slug.length === 0) slug = 'user'
        if (slug.length < MIN_LENGTH) slug = slug.padEnd(MIN_LENGTH, '0')
        if (slug.length > MAX_LENGTH) slug = slug.slice(0, MAX_LENGTH)
        return slug
    }

    override equals(other: DisplayNameVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: string): void {
        if (!HANDLE_RE.test(value)) {
            throw new InvalidDisplayNameError()
        }
    }
}
