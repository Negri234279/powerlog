import type { DomainEvent } from './domain-event'

/** Raised when a new user is created (password or Google registration). */
export class UserRegisteredEvent implements DomainEvent {
    constructor(
        public readonly userId: string,
        public readonly email: string,
        public readonly occurredAt: Date,
    ) {}
}
