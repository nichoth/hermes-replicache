import { Handler, HandlerEvent } from '@netlify/functions'
import { MutationV1 } from 'replicache'
import { ITask } from 'pg-promise'
import { serverID, tx } from '../db.js'
import { headers } from '../util.js'
// import Pusher from 'pusher'

type Message = {
    from: string;
    content: string;
    order: number;
};

type MessageWithID = Message & { id: string };

export const handler:Handler = async function handler (ev:HandlerEvent) {
    if (ev.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers }
    }
    if (ev.httpMethod !== 'POST') return { statusCode: 405 }
    const push = JSON.parse(ev.body!)
    console.log('Processing push', push)

    const t0 = Date.now()
    try {
        // Iterate each mutation in the push.
        for (const mutation of push.mutations) {
            const t1 = Date.now()

            try {
                await tx(t => processMutation(t, push.clientGroupID, mutation))
            } catch (err) {
                console.error('errr in mutation', mutation, err)

                // Handle errors inside mutations by skipping and moving on. This is
                // convenient in development but you may want to reconsider as your app
                // gets close to production:
                //
                // https://doc.replicache.dev/server-push#error-handling
                //
                // Ideally we would run the mutator itself in a nested transaction, and
                // if that fails, rollback just the mutator and allow the lmid and
                // version updates to commit. However, nested transaction support in
                // Postgres is not great:
                //
                // https://postgres.ai/blog/20210831-postgresql-subtransactions-considered-harmful
                //
                // Instead we implement skipping of failed mutations by *re-runing*
                // them, but passing a flag that causes the mutator logic to be skipped.
                //
                // This ensures that the lmid and version bookkeeping works exactly the
                // same way as in the happy path. A way to look at this is that for the
                // error-case we replay the mutation but it just does something
                // different the second time.
                //
                // This is allowed in Replicache because mutators don't have to be
                // deterministic!:
                //
                // https://doc.replicache.dev/concepts/how-it-works#speculative-execution-and-confirmation

                await tx(t => processMutation(t, push.clientGroupID, mutation, err))
            }

            console.log('Processed mutation in', Date.now() - t1)
        }

        await sendPoke()
        return { statusCode: 200, body: '{}' }
    } catch (err) {
        console.error(err)
        return { statusCode: 500, body: err.toString() }
    } finally {
        console.log('Processed push in', Date.now() - t0)
    }
}

async function processMutation (
    t: ITask<{}>,
    clientGroupID: string,
    mutation: MutationV1,
    error?: string | undefined,
) {
    const { clientID } = mutation

    // Get the previous version and calculate the next one.
    const { version: prevVersion } = await t.one(
        'select version from replicache_server where id = $1 for update',
        serverID,
    )
    const nextVersion = prevVersion + 1

    const lastMutationID = await getLastMutationID(t, clientID)
    const nextMutationID = lastMutationID + 1

    console.log('nextVersion', nextVersion, 'nextMutationID', nextMutationID)

    // It's common due to connectivity issues for clients to send a
    // mutation which has already been processed. Skip these.
    if (mutation.id < nextMutationID) {
        console.log(
      `Mutation ${mutation.id} has already been processed - skipping`,
        )
        return
    }

    // If the Replicache client is working correctly, this can never
    // happen. If it does there is nothing to do but return an error to
    // client and report a bug to Replicache.
    if (mutation.id > nextMutationID) {
        throw new Error(
      `Mutation ${mutation.id} is from the future - aborting. This can happen in development if the server restarts. In that case, clear appliation data in browser and refresh.`,
        )
    }

    if (error === undefined) {
        console.log('Processing mutation:', JSON.stringify(mutation))

        // For each possible mutation, run the server-side logic to apply the
        // mutation.
        switch (mutation.name) {
        case 'createMessage':
            await createMessage(t, mutation.args as MessageWithID, nextVersion)
            break
        default:
            throw new Error(`Unknown mutation: ${mutation.name}`)
        }
    } else {
    // TODO: You can store state here in the database to return to clients to
    // provide additional info about errors.
        console.log(
            'Handling error from mutation',
            JSON.stringify(mutation),
            error,
        )
    }

    console.log('setting', clientID, 'last_mutation_id to', nextMutationID)
    // Update lastMutationID for requesting client.
    await setLastMutationID(
        t,
        clientID,
        clientGroupID,
        nextMutationID,
        nextVersion,
    )

    // Update global version.
    await t.none('update replicache_server set version = $1 where id = $2', [
        nextVersion,
        serverID,
    ])
}

export async function getLastMutationID (t: ITask<{}>, clientID: string) {
    const clientRow = await t.oneOrNone(
        'select last_mutation_id from replicache_client where id = $1',
        clientID,
    )
    if (!clientRow) {
        return 0
    }
    return parseInt(clientRow.last_mutation_id)
}

async function setLastMutationID (
    t: ITask<{}>,
    clientID: string,
    clientGroupID: string,
    mutationID: number,
    version: number,
) {
    const result = await t.result(
    `update replicache_client set
      client_group_id = $2,
      last_mutation_id = $3,
      version = $4
    where id = $1`,
    [clientID, clientGroupID, mutationID, version],
    )
    if (result.rowCount === 0) {
        await t.none(
            `insert into replicache_client (
                id,
                client_group_id,
                last_mutation_id,
                version
            ) values ($1, $2, $3, $4)`,
            [clientID, clientGroupID, mutationID, version],
        )
    }
}

async function createMessage (
    t: ITask<{}>,
    { id, from, content, order }: MessageWithID,
    version: number,
) {
    await t.none(
        `insert into message (
        id, sender, content, ord, deleted, version) values
        ($1, $2, $3, $4, false, $5)`,
        [id, from, content, order, version],
    )
}

async function sendPoke () {
    // TODO
}
