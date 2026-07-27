import { ConversationEntity } from '../../../src/modules/chat/domain/entities/conversation.entity'

const DEFAULT_NOW = new Date('2026-01-01T00:00:00.000Z')

/**
 * Object Mother for conversations. Fluent builder with sane defaults:
 *   ConversationMother.create().between("coach-1", "athlete-1").build()
 */
export class ConversationMother {
    private id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    private coachId = 'coach-1'
    private athleteId = 'athlete-1'
    private createdAt = DEFAULT_NOW

    static create(): ConversationMother {
        return new ConversationMother()
    }

    withId(id: string): this {
        this.id = id
        return this
    }

    between(coachId: string, athleteId: string): this {
        this.coachId = coachId
        this.athleteId = athleteId
        return this
    }

    createdAtTime(at: Date): this {
        this.createdAt = at
        return this
    }

    build(): ConversationEntity {
        return ConversationEntity.rehydrate({
            id: this.id,
            coachId: this.coachId,
            athleteId: this.athleteId,
            createdAt: this.createdAt,
        })
    }
}
