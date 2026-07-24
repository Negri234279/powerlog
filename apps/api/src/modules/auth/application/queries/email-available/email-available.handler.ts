import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs'

import { UserRepository } from '../../../domain/repositories/user.repository'
import { EmailVO } from '../../../domain/value-objects/email.vo'
import { EmailAvailableQuery } from './email-available.query'

/**
 * Whether an email is free to register. Normalizes with EmailVO so the answer
 * matches register's own dedup (`findByEmail`) — no false "available" for a
 * differently-cased duplicate. Public + throttled at the resolver: it reveals the
 * same email-in-use signal register already surfaces on submit.
 */
@QueryHandler(EmailAvailableQuery)
export class EmailAvailableHandler implements IQueryHandler<EmailAvailableQuery, boolean> {
    constructor(private readonly users: UserRepository) {}

    async execute(query: EmailAvailableQuery): Promise<boolean> {
        const email = EmailVO.create(query.email)
        return !(await this.users.findByEmail(email))
    }
}
