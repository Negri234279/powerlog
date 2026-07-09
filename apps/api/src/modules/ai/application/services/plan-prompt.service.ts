import type { SessionPlanContext } from '../../../../shared/contracts/session-plan-context'

/**
 * The model's whole job, stated once. Two rules matter more than the coaching:
 * it must answer with JSON only, and it must only ever name set ids it was
 * given — that is what stops it from inventing sets the session doesn't have.
 */
export const PLAN_SYSTEM_PROMPT = `You are a strength coach programming one training session for an athlete.

You are given the session's exercises, the sets that need targets, and the athlete's recent performance on
each exercise — including the notes they wrote about how it felt. Use the notes: "felt heavy", "slept badly"
or "belt from set 2" should change what you prescribe.

Prescribe a target for EVERY set you are given, and only for those sets.

Rules:
- Answer with a single JSON object and nothing else. No prose, no markdown, no code fences.
- Weights are kilograms. Round to the nearest 2.5 kg, or 1.25 kg for small lifts.
- Give either "rpe" (6-10) or "rir" (0-5) for a set, never both. Use null for the one you don't use.
- Only use the exact "setId" values you were given. Never invent one, never omit one.
- Progress conservatively when the history is thin, or when the notes suggest fatigue.
- Keep each set's "note" under 80 characters, or null if you have nothing useful to say.

Answer with exactly this shape:
{
  "rationale": "two or three sentences on how you programmed this session",
  "sets": [
    { "setId": "<given id>", "weightKg": 100, "reps": 5, "rpe": 8, "rir": null, "note": "top set" }
  ]
}`

/**
 * Serialises the context as JSON rather than prose. It is what the model reads
 * best, it keeps set ids verbatim, and it makes the prompt cheap to eyeball when
 * a prescription looks wrong.
 */
export function buildPlanUserPrompt(context: SessionPlanContext): string {
    const payload = {
        session: {
            performedAt: context.performedAt.toISOString().slice(0, 10),
            notes: context.sessionNotes,
        },
        exercises: context.exercises.map((exercise) => ({
            name: exercise.name,
            notes: exercise.entryNotes,
            setsToPrescribe: exercise.sets.map((set) => ({
                setId: set.setId,
                order: set.order,
                currentPlannedWeightKg: set.plannedWeightKg,
                currentPlannedReps: set.plannedReps,
            })),
            recentSessions: exercise.history.map((session) => ({
                performedAt: session.performedAt.toISOString().slice(0, 10),
                sessionNotes: session.sessionNotes,
                exerciseNotes: session.exerciseNotes,
                sets: session.sets.map((set) => ({
                    weightKg: set.weightKg,
                    reps: set.reps,
                    rpe: set.rpe,
                    rir: set.rir,
                    e1rmKg: set.e1rmKg,
                    notes: set.notes,
                })),
            })),
        })),
    }

    return `Program this session.\n\n${JSON.stringify(payload, null, 2)}`
}

/** Nudge sent back when the model's previous answer failed validation. */
export function buildRetryPrompt(reason: string): string {
    return `Your previous answer was rejected: ${reason}\n\nAnswer again with the JSON object only.`
}

/**
 * The athlete's revision request, with the plan being revised attached. The
 * current proposal has not been written to the session, so the context alone
 * would show the model empty targets — it needs to be shown its own last answer.
 */
export function buildRefinePrompt(request: string, sets: readonly PlanDraftSetLike[]): string {
    const proposal = sets.map((set) => ({
        setId: set.setId,
        weightKg: set.plannedWeightKg,
        reps: set.plannedReps,
        rpe: set.rpe,
        rir: set.rir,
        note: set.notes,
    }))

    return `${request}\n\nThis is the plan you proposed and I am asking you to revise:\n${JSON.stringify({ sets: proposal }, null, 2)}`
}

/** The shape `buildRefinePrompt` needs — matches the draft's stored sets. */
interface PlanDraftSetLike {
    setId: string
    plannedWeightKg: number | null
    plannedReps: number | null
    rpe: number | null
    rir: number | null
    notes: string | null
}
