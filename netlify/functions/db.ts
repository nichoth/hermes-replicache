// import { newDb } from 'pg-mem'
import Debug from '@nichoth/debug'
import pgp, { IDatabase, ITask, txMode } from 'pg-promise'

const debug = Debug()

export type Executor = ITask<unknown>

export async function createDatabase (t: Executor) {
    if (await schemaExists(t)) {
        return
    }
    debug('creating database')
    await createSchemaVersion1(t)
}

export async function createSchemaVersion1 (t: Executor) {
    await t.none(`create table replicache_space (
      id text primary key not null,
      version integer not null)`)
    await t.none(
        'insert into replicache_space (id, version) values (\'global\', 0)'
    )

    await t.none(`create table replicache_client_group (
      id text primary key not null,
      user_id text not null)`)

    await t.none(`create table replicache_client (
      id text primary key not null,
      client_group_id text not null references replicache_client_group(id),
      last_mutation_id integer not null,
      last_modified_version integer not null)`)
    await t.none(
        'create index on replicache_client (client_group_id, last_modified_version)'
    )

    await t.none(`create table entry (
      key text not null,
      value text not null,
      deleted boolean not null,
      last_modified_version integer not null)`)

    await t.none('create unique index on entry (key)')
    await t.none('create index on entry (deleted)')
    await t.none('create index on entry (last_modified_version)')

    // We are going to be using the supabase realtime api from the client to
    // receive pokes. This requires js access to db. We use RLS to restrict this
    // access to only what is needed: read access to the space table. All this
    // gives JS is the version of the space which is harmless. Everything else is
    // auth'd through cookie auth using normal web application patterns.
    await t.none('alter table replicache_space enable row level security')
    await t.none('alter table replicache_client_group enable row level security')
    await t.none('alter table replicache_client enable row level security')
    await t.none('alter table replicache_client enable row level security')
    await t.none(`create policy anon_read_replicache_space on replicache_space
        for select to anon using (true)`)

    // Here we enable the supabase realtime api and monitor updates to the
    // replicache_space table.
    await t.none(`alter publication supabase_realtime
      add table replicache_space`)
    await t.none(`alter publication supabase_realtime set
      (publish = 'update');`)
}

async function schemaExists (t: Executor): Promise<number> {
    const spaceExists = await t.one(`select exists(
        select from pg_tables where schemaname = 'public'
        and tablename = 'replicache_space')`)
    return spaceExists.exists
}

// const { isolationLevel } = pgp.txMode

// export const serverID = 1

// // /**
// //  * Global Version strategy
// //  * https://doc.replicache.dev/byob/remote-schema#define-the-schema
// //  */

// // async function initDB () {
// //     console.log('initializing database...')

// //     const db = newDb().adapters.createPgPromise()

// //     await tx(async t => {
// //         // A single global version number for the entire database.
// //         await t.none(
// //             'create table replicache_server (id integer primary key not null, version integer)',
// //         )
// //         await t.none(
// //             'insert into replicache_server (id, version) values ($1, 1)',
// //             serverID,
// //         )

// //         // Stores chat messages.
// //         await t.none(`create table message (
// //         id text primary key not null,
// //         sender varchar(255) not null,
// //         content text not null,
// //         ord integer not null,
// //         deleted boolean not null,
// //         version integer not null)`)

// //         // Stores last mutationID processed for each Replicache client.
// //         await t.none(`create table replicache_client (
// //         id varchar(36) primary key not null,
// //         client_group_id varchar(36) not null,
// //         last_mutation_id integer not null,
// //         version integer not null)`)

// //         // TODO: indexes
// //     }, db)

// //     return db
// // }

// // function getDB () {
// //     // Cache the database in the Node global so that it survives HMR.
// //     if (!global.__db) {
// //         global.__db = initDB()
// //     }
// //     return global.__db as IDatabase<{}>
// // }

// // // Helper to make sure we always access database at serializable level.
// // export async function tx<R> (
// //     f: (t: ITask<{}> & {}) => Promise<R>,
// //     dbp = getDB(),
// // ) {
// //     const db = await dbp

// //     return await db.tx(
// //         {
// //             mode: new txMode.TransactionMode({
// //                 tiLevel: isolationLevel.serializable,
// //             }),
// //         },
// //         f,
// //     )
// // }
