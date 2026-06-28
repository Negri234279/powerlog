import { ProfileConfig } from '../../../src/modules/profile/application/ports/profile-config.port'

/** ProfileConfig with a fixed default-avatar URL (none by default). */
export class FakeProfileConfig extends ProfileConfig {
    constructor(readonly defaultAvatarUrl: string = '') {
        super()
    }
}
