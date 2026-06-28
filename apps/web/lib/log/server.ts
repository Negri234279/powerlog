import 'server-only'

// Minimal structured server logger for the web app. Emits one JSON object per
// line to stdout/stderr; in containers Alloy ships those to Loki (labelled by
// the `web` compose service), giving parity with the API's Pino logs. Kept
// dependency-free (no pino) so it works in both the Node and Edge runtimes.
//
// Rules mirror the API (see CLAUDE.md): structured fields, never secrets/PII
// (no tokens, cookies, full emails). info = notable state changes, warn/error =
// problems, debug = routine flow.
type Level = 'debug' | 'info' | 'warn' | 'error'
type Fields = Record<string, unknown>

const SERVICE = 'powerlog-web'

function emit(level: Level, msg: string, fields?: Fields): void {
    const line = JSON.stringify({ level, time: new Date().toISOString(), service: SERVICE, msg, ...fields })
    // error/warn → stderr, the rest → stdout. Alloy ships both streams.
    if (level === 'error') console.error(line)
    else if (level === 'warn') console.warn(line)
    else console.log(line)
}

export const log = {
    debug: (msg: string, fields?: Fields): void => emit('debug', msg, fields),
    info: (msg: string, fields?: Fields): void => emit('info', msg, fields),
    warn: (msg: string, fields?: Fields): void => emit('warn', msg, fields),
    error: (msg: string, fields?: Fields): void => emit('error', msg, fields),
}
