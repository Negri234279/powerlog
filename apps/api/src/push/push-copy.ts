import type { PushPayload } from './push.types'

/** The push channel supports the same two locales as the web (es/en); anything
 *  else falls back to English. */
function isSpanish(locale: string): boolean {
    return locale === 'es'
}

/**
 * The localized copy for each kind of push. Kept together (not scattered across
 * the handlers) so the two languages stay side by side and easy to keep in sync —
 * the API's small equivalent of the web's message catalog. Each returns a
 * `PushPayload`; handlers wrap the call in a `(locale) => …` factory so every
 * recipient device renders in its own language.
 */
export const PushCopy = {
    sessionPlanned(locale: string, coach: string): PushPayload {
        return isSpanish(locale)
            ? {
                  title: 'Sesión programada',
                  body: `@${coach} te ha programado una sesión`,
                  url: '/workouts',
                  tag: 'session-planned',
              }
            : {
                  title: 'Session planned',
                  body: `@${coach} planned a session for you`,
                  url: '/workouts',
                  tag: 'session-planned',
              }
    },

    mesocycleAssigned(locale: string, coach: string, name: string): PushPayload {
        return isSpanish(locale)
            ? {
                  title: 'Nuevo mesociclo',
                  body: `@${coach} te ha asignado «${name}»`,
                  url: '/workouts/mesocycles',
                  tag: 'mesocycle-assigned',
              }
            : {
                  title: 'New training block',
                  body: `@${coach} assigned you “${name}”`,
                  url: '/workouts/mesocycles',
                  tag: 'mesocycle-assigned',
              }
    },

    coachInvitation(locale: string, coach: string): PushPayload {
        return isSpanish(locale)
            ? {
                  title: 'Invitación de coach',
                  body: `@${coach} quiere entrenarte`,
                  url: '/coaching',
                  tag: 'coach-invitation',
              }
            : {
                  title: 'Coach invitation',
                  body: `@${coach} wants to coach you`,
                  url: '/coaching',
                  tag: 'coach-invitation',
              }
    },

    aiReady(locale: string, url: string): PushPayload {
        return isSpanish(locale)
            ? {
                  title: 'Tu plan de IA está listo',
                  body: 'La generación ha terminado. Toca para revisarlo.',
                  url,
                  tag: 'ai-ready',
              }
            : {
                  title: 'Your AI plan is ready',
                  body: 'The generation finished. Tap to review it.',
                  url,
                  tag: 'ai-ready',
              }
    },

    /** Chat renders the sender's handle as the title and the message preview as the
     *  body; the `tag` collapses several messages from one conversation. */
    chatMessage(sender: string, preview: string, url: string, conversationId: string): PushPayload {
        return {
            title: `@${sender}`,
            body: preview,
            url,
            tag: `chat-${conversationId}`,
        }
    },
}
