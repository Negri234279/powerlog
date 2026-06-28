import { Injectable } from '@nestjs/common'
import { CommandBus } from '@nestjs/cqrs'

import { ProfileProvisioner, type ProfileProvisionInput } from '../shared/contracts/profile-provisioner'
import { ProvisionProfileCommand } from '../shared/contracts/provision-profile.command'

/**
 * Bridges the auth-side `ProfileProvisioner` port to the profile module via the
 * CommandBus. Kept outside `src/modules` so dispatching the shared command never
 * crosses a module boundary, and decoupled through the bus (global via
 * `CqrsModule.forRoot`) so auth and profile don't depend on each other. The
 * command awaits the handler and surfaces its failure, which is what lets the
 * register flow compensate.
 */
@Injectable()
export class CommandBusProfileProvisioner extends ProfileProvisioner {
    constructor(private readonly commandBus: CommandBus) {
        super()
    }

    async provision(input: ProfileProvisionInput): Promise<void> {
        await this.commandBus.execute(
            new ProvisionProfileCommand(
                input.userId,
                input.email,
                input.username,
                input.firstName,
                input.lastName,
                input.birthDate,
                input.heightCm,
            ),
        )
    }
}
