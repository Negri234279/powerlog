import type { SessionPlanContext } from '../../../../shared/contracts/session-plan-context'
import type { PlanDraftSet } from '../../domain/entities/ai-plan-draft.entity'

/**
 * The model's whole job, stated once. Two rules matter more than the coaching:
 * it must answer with JSON only, and it must only ever name entry ids it was
 * given — that is what stops it from programming exercises the session doesn't
 * have. Within an exercise the set count is the model's call: that is precisely
 * what we're asking it for.
 */
export const PLAN_SYSTEM_PROMPT = `You are a strength coach programming one training session for an athlete.

You are given the session's exercises and the athlete's recent performance on each — including the notes
they wrote about how it felt. The notes outrank the numbers: "felt heavy", "slept badly" or "belt from
set 2" should change what you prescribe.

Program EVERY exercise you are given, and only those. For each one, prescribe today's working sets:

- Decide the set count yourself. Typical: 3-5 working sets for a heavy compound lift, 2-4 for accessories.
  A top set followed by lighter back-off sets is a sound default for the main lifts.
- If the exercise already lists programmed sets ("currentSets"), treat that as the athlete's intended
  scheme: keep the count and fill in the targets, unless the history clearly argues otherwise.
- Anchor the load on the most recent comparable sets and the estimated 1RM (e1rmKg). Progress in small
  steps (~2.5% or one rep) when the last session was completed at or under the target intensity; repeat
  the load when it was at the limit; back off when the history is thin or the notes suggest fatigue.

Rules:
- Answer with a single JSON object and nothing else. No prose, no markdown, no code fences.
- Weights are kilograms. Round to the nearest 2.5 kg, or 1.25 kg for small lifts.
- Give either "rpe" (6-10) or "rir" (0-5) for a set, never both. Use null for the one you don't use.
- Use the exact "entryId" values you were given. Program each exactly once. Never invent one.
- 1 to 8 sets per exercise.
- Keep each set's "note" under 80 characters, or null if you have nothing useful to say.

Answer with exactly this shape:
{
  "rationale": "two or three sentences on how you programmed this session",
  "exercises": [
    {
      "entryId": "<given id>",
      "sets": [
        { "weightKg": 100, "reps": 5, "rpe": 8, "rir": null, "note": "top set" },
        { "weightKg": 90, "reps": 8, "rpe": null, "rir": 2, "note": "back-off" }
      ]
    }
  ]
}`

/**
 * Serialises the context as JSON rather than prose. It is what the model reads
 * best, it keeps entry ids verbatim, and it makes the prompt cheap to eyeball
 * when a prescription looks wrong.
 */
export function buildPlanUserPrompt(context: SessionPlanContext, extraInfo?: string | null): string {
    const payload = {
        session: {
            performedAt: context.performedAt.toISOString().slice(0, 10),
            notes: context.sessionNotes,
        },
        exercises: context.exercises.map((exercise) => ({
            entryId: exercise.entryId,
            name: exercise.name,
            notes: exercise.entryNotes,
            // The scheme the athlete (or their template) already put down, if any.
            // An empty list means the set count is entirely the model's call.
            currentSets: exercise.sets.map((set) => ({
                order: set.order,
                plannedWeightKg: set.plannedWeightKg,
                plannedReps: set.plannedReps,
                rpe: set.rpe,
                rir: set.rir,
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

    // Programming a single exercise is the same job on a smaller scope; saying so
    // stops the model from wondering where the rest of the session went.
    const task =
        context.exercises.length === 1
            ? `Program today's working sets for this one exercise, "${context.exercises[0]?.name}", within the session below.`
            : 'Program this session.'

    // The athlete's own words go last and are called out as such: they are the
    // freshest information, and they override what the history alone suggests.
    const note = extraInfo ? `\n\nThe athlete adds, and this outranks the history:\n${extraInfo}` : ''

    return `${task}${note}\n\n${JSON.stringify(payload, null, 2)}`
}

/** Nudge sent back when the model's previous answer failed validation. */
export function buildRetryPrompt(reason: string): string {
    return `Your previous answer was rejected: ${reason}\n\nAnswer again with the JSON object only.`
}

/**
 * The athlete's revision request, with the plan being revised attached. The
 * current proposal has not been written to the session, so the context alone
 * would show the model stale targets — it needs to be shown its own last answer.
 */
export function buildRefinePrompt(request: string, sets: readonly PlanDraftSet[]): string {
    const byEntry = new Map<string, PlanDraftSet[]>()
    for (const set of sets) {
        const list = byEntry.get(set.entryId) ?? []
        list.push(set)
        byEntry.set(set.entryId, list)
    }

    const proposal = [...byEntry.entries()].map(([entryId, entrySets]) => ({
        entryId,
        sets: entrySets
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((set) => ({
                weightKg: set.plannedWeightKg,
                reps: set.plannedReps,
                rpe: set.rpe,
                rir: set.rir,
                note: set.notes,
            })),
    }))

    return `${request}\n\nThis is the plan you proposed and I am asking you to revise:\n${JSON.stringify({ exercises: proposal }, null, 2)}`
}
