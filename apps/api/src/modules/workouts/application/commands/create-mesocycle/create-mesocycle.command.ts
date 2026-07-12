import type { MesocycleContentRaw } from '../../mesocycle-content'

export class CreateMesocycleCommand {
    constructor(
        public readonly userId: string,
        public readonly content: MesocycleContentRaw,
        /** Set when a coach builds the block for one of their athletes: the athlete
         *  owns it, the coach is stamped as its planner (and is the one who edits it). */
        public readonly athleteId?: string,
    ) {}
}
