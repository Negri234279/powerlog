import { readFile } from 'node:fs/promises'

import { sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

interface Journal {
    entries: { idx: number; tag: string }[]
}

/**
 * Apply migrations in journal order up to and including `tag`, and no further.
 *
 * Migration-behaviour specs replay a specific migration against the schema it
 * was written for, not against HEAD — a later migration may rename or drop the
 * very columns under test. Drizzle's own `migrate()` only runs to the end, so
 * this walks the journal by hand to stop at the right point. The split on
 * `--> statement-breakpoint` mirrors how drizzle-kit emits multi-statement files.
 */
export async function migrateUpTo(db: NodePgDatabase, tag: string): Promise<void> {
    const journal = JSON.parse(await readFile('./drizzle/meta/_journal.json', 'utf8')) as Journal
    const ordered = [...journal.entries].sort((a, b) => a.idx - b.idx)
    const last = ordered.findIndex((entry) => entry.tag === tag)

    if (last === -1) throw new Error(`${tag} is not in the migration journal`)

    for (const entry of ordered.slice(0, last + 1)) {
        const file = await readFile(`./drizzle/${entry.tag}.sql`, 'utf8')

        for (const statement of file.split('--> statement-breakpoint')) {
            const trimmed = statement.trim()
            if (trimmed) await db.execute(sql.raw(trimmed))
        }
    }
}
