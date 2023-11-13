import { newDb } from 'pg-mem'
import pgp, { IDatabase, ITask, txMode } from 'pg-promise'

const { isolationLevel } = pgp.txMode

export const serverID = 1

async function initDB () {
    console.log('initializing database...')
    const db = newDb().adapters.createPgPromise()
    return db
}

function getDB () {
    // Cache the database in the Node global so that it survives HMR.
    if (!global.__db) {
        global.__db = initDB()
    }
    return global.__db as IDatabase<{}>
}

// Helper to make sure we always access database at serializable level.
export async function tx<R> (
    f: (t: ITask<{}> & {}) => Promise<R>,
    dbp = getDB(),
) {
    const db = await dbp
    return await db.tx(
        {
            mode: new txMode.TransactionMode({
                tiLevel: isolationLevel.serializable,
            }),
        },
        f,
    )
}
