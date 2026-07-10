/**
 * Why a model's answer was rejected. Carried back to the model on the retry, so
 * the wording is written for it, not for the athlete — it never reaches a client.
 * Shared by every parser: a rejected answer is a rejected answer, whatever it was
 * supposed to contain.
 */
export class ModelAnswerRejection extends Error {}

/**
 * Models are told to answer with bare JSON, and mostly do — but they also like
 * to wrap it in a code fence or add a sentence first. Rather than fail on that,
 * take the outermost braces.
 */
export function extractJson(text: string): string {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end <= start) throw new ModelAnswerRejection('the answer contained no JSON object')

    return text.slice(start, end + 1)
}

/** Parse the outermost JSON object, or reject the answer with a reason. */
export function parseJsonObject(text: string): unknown {
    try {
        return JSON.parse(extractJson(text))
    } catch (error) {
        if (error instanceof ModelAnswerRejection) throw error
        throw new ModelAnswerRejection('the JSON object was malformed')
    }
}
