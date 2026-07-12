import {
    type MesocycleDesignContext,
    MesocycleDesignContextReader,
} from '../../../src/shared/contracts/mesocycle-design-context'

/** Serves a fixed design context, and records who asked and for whom. */
export class StubMesocycleDesignContextReader extends MesocycleDesignContextReader {
    readonly readFor: string[] = []
    /** The trainee each read was for: null when the caller designed for themselves. */
    readonly readTrainees: (string | null)[] = []

    constructor(private readonly context: MesocycleDesignContext) {
        super()
    }

    async read(userId: string, athleteId: string | null = null): Promise<MesocycleDesignContext> {
        this.readFor.push(userId)
        this.readTrainees.push(athleteId)

        return this.context
    }
}
