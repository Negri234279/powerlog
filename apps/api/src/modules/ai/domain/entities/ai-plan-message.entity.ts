export type PlanMessageRole = 'user' | 'assistant'

export interface AiPlanMessageProps {
    id: string
    role: PlanMessageRole
    content: string
    createdAt: Date
}

/**
 * One turn of the conversation attached to a draft: what the athlete asked for
 * ("more volume on bench") and how the model justified its answer. Part of the
 * `AiPlanDraft` aggregate — only ever created through its root.
 */
export class AiPlanMessageEntity {
    private constructor(private readonly props: AiPlanMessageProps) {}

    static create(props: AiPlanMessageProps): AiPlanMessageEntity {
        return new AiPlanMessageEntity(props)
    }

    get id(): string {
        return this.props.id
    }
    get role(): PlanMessageRole {
        return this.props.role
    }
    get content(): string {
        return this.props.content
    }
    get createdAt(): Date {
        return this.props.createdAt
    }
}
