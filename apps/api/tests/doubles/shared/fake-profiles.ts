import { ProfileProvisioner, type ProfileProvisionInput } from '../../../src/shared/contracts/profile-provisioner'
import type { ProfileSnapshot, ProfileSnapshotReader } from '../../../src/shared/contracts/profile-snapshot-reader'

/**
 * Combined double for the cross-module profile boundary auth depends on:
 * `ProfileProvisioner` (write) + `ProfileSnapshotReader` (read). Provisioning
 * populates the snapshot the SessionIssuer reads at sign time — mirroring the
 * real flow (profile created before a session is issued). Records provision
 * calls and can be told to fail (registration rollback). Seed snapshots for
 * users that already exist (login/refresh) with `set`.
 */
export class FakeProfiles extends ProfileProvisioner implements ProfileSnapshotReader {
    readonly calls: ProfileProvisionInput[] = []
    private readonly byUser = new Map<string, ProfileSnapshot>()
    private error: Error | null = null

    /** Make the next (and subsequent) provision calls reject with `error`. */
    failWith(error: Error): this {
        this.error = error
        return this
    }

    /** Seed a snapshot for a user that exists without going through provisioning. */
    set(userId: string, snapshot: ProfileSnapshot): this {
        this.byUser.set(userId, snapshot)
        return this
    }

    async provision(input: ProfileProvisionInput): Promise<void> {
        this.calls.push(input)
        if (this.error) throw this.error
        // Mirror profile's handle rule: chosen handle, else derived from the email.
        const handle = (input.username ?? input.email.split('@')[0] ?? input.email).toLowerCase()
        this.byUser.set(input.userId, { username: handle, avatarUrl: null, locale: null })
    }

    async read(userId: string): Promise<ProfileSnapshot | null> {
        return this.byUser.get(userId) ?? null
    }
}
