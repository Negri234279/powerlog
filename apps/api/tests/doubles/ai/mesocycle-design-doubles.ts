import {
    type MesocycleDesignContext,
    MesocycleDesignContextReader,
} from '../../../src/shared/contracts/mesocycle-design-context'

/** Serves a fixed design context, and records who asked for it. */
export class StubMesocycleDesignContextReader extends MesocycleDesignContextReader {
    readonly readFor: string[] = []

    constructor(private readonly context: MesocycleDesignContext) {
        super()
    }

    async read(userId: string): Promise<MesocycleDesignContext> {
        this.readFor.push(userId)

        return this.context
    }
}
