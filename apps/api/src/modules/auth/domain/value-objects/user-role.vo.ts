import { ValueObject } from '../../../../shared/domain/value-object'
import { InvalidUserRoleError } from '../errors/auth.errors'

export type UserRoleValue = 'athlete' | 'coach'

const VALID: readonly UserRoleValue[] = ['athlete', 'coach']

/**
 * User role value object ("athlete" | "coach"). Orthogonal to admin status,
 * which is a separate boolean on the user — admin is not a role here.
 */
export class UserRoleVO extends ValueObject<UserRoleValue> {
    static create(raw: string): UserRoleVO {
        return new UserRoleVO(raw as UserRoleValue)
    }

    static athlete(): UserRoleVO {
        return new UserRoleVO('athlete')
    }

    static coach(): UserRoleVO {
        return new UserRoleVO('coach')
    }

    /** Default for new registrations. */
    static default(): UserRoleVO {
        return UserRoleVO.athlete()
    }

    override equals(other: UserRoleVO): boolean {
        return this.value === other.value
    }

    protected override assertIsValid(value: UserRoleValue): void {
        if (!VALID.includes(value)) {
            throw new InvalidUserRoleError(value)
        }
    }
}
