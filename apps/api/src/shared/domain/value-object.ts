/**
 * Generic base for domain value objects.
 *
 * An immutable wrapper around a primitive (or structural) value that validates
 * itself on construction — so any `ValueObject` instance in the domain is
 * guaranteed valid. Subclasses implement the invariant (`assertIsValid`) and
 * equality. The constructor is `protected`: build VOs through a static factory.
 */
export abstract class ValueObject<T> {
    protected constructor(public readonly value: T) {
        this.assertIsValid(value)
    }

    abstract equals(other: ValueObject<T>): boolean

    /** Throw a domain error if `value` violates the VO's invariant. */
    protected abstract assertIsValid(value: T): void
}
