import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs'

import { InvalidCurrentPasswordError, UserNotFoundError } from '../../../domain/errors/auth.errors'
import { UserRepository } from '../../../domain/repositories/user.repository'
import { PasswordHashVO } from '../../../domain/value-objects/password-hash.vo'
import { Clock } from '../../ports/clock.port'
import { PasswordHasher } from '../../ports/password-hasher.port'
import { ChangePasswordCommand } from './change-password.command'

@CommandHandler(ChangePasswordCommand)
export class ChangePasswordHandler implements ICommandHandler<ChangePasswordCommand, void> {
    constructor(
        private readonly users: UserRepository,
        private readonly hasher: PasswordHasher,
        private readonly clock: Clock,
    ) {}

    async execute(command: ChangePasswordCommand): Promise<void> {
        const user = await this.users.findById(command.userId)
        if (!user) {
            throw new UserNotFoundError()
        }

        // Accounts with a password must prove the current one; Google-only
        // accounts may set a password for the first time without it.
        const currentHash = user.passwordHash?.value
        if (currentHash) {
            const ok = command.currentPassword ? await this.hasher.verify(currentHash, command.currentPassword) : false
            if (!ok) {
                throw new InvalidCurrentPasswordError()
            }
        }

        const newHash = PasswordHashVO.fromHash(await this.hasher.hash(command.newPassword))
        user.setPassword(newHash, this.clock.now())
        await this.users.save(user)
    }
}
