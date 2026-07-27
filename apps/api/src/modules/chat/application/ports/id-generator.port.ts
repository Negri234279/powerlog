/**
 * Abstracts id creation so handlers don't depend on a concrete uuid library and
 * tests can use deterministic ids. Infrastructure binds it to a uuid generator.
 */
export abstract class IdGenerator {
    abstract uuid(): string
}
