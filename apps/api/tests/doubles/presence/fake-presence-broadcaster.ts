import { PresenceBroadcaster, type PresenceUpdate } from '../../../src/presence/presence-broadcaster'

interface Emitted {
    recipientIds: string[]
    update: PresenceUpdate
}

/** Records presence transitions that would have been pushed, without a gateway. */
export class FakePresenceBroadcaster extends PresenceBroadcaster {
    readonly emitted: Emitted[] = []

    async emit(recipientIds: string[], update: PresenceUpdate): Promise<void> {
        this.emitted.push({ recipientIds, update })
    }

    /** Test inspection: only the transitions of a given online-ness. */
    updatesWhere(online: boolean): Emitted[] {
        return this.emitted.filter((e) => e.update.online === online)
    }
}
