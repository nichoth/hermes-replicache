import 'dotenv/config'
import { Handler, HandlerEvent } from '@netlify/functions'
import { ReplicacheTransaction } from 'replicache-transaction'
import { z } from 'zod'
import Pusher from 'pusher'
import { Executor, tx, getGlobalVersion, PostgresStorage } from '../db.js'
import {
    Client,
    getClient,
    createClient,
    createClientGroup,
    updateClient,
    setGlobalVersion
} from '../data.js'
import { getClientGroup, headers } from '../util.js'
import { mutators } from '../../../src/mutators.js'

const authError = {}
const clientStateNotFoundError = new Error('Client state not found')

const mutationSchema = z.object({
    id: z.number(),
    clientID: z.string(),
    name: z.string(),
    args: z.any(),
})

const pushRequestSchema = z.object({
    clientGroupID: z.string(),
    mutations: z.array(mutationSchema),
})

type PushRequest = z.infer<typeof pushRequestSchema>;

export const handler:Handler = async function (ev:HandlerEvent) {
    if (!ev.body) return { statusCode: 400, headers }
    const userID = (ev.headers.cookie && ev.headers.cookie['userID']) || 'anon'
    const body = JSON.parse(ev.body)

    const push = pushRequestSchema.parse(body)

    console.log('**processing push**', push)
    console.log('**user id**', userID)

    try {
        await processPush(push, userID)
    } catch (err) {
        if (!(err instanceof Error)) return { statusCode: 500, headers }
        /**
         * @TODO handle errors
         * see example https://github.com/rocicorp/todo-nextjs/blob/main/pages/api/replicache/push.ts#L45
         */
        return { statusCode: 500, headers, body: err.toString() }
    }

    return { statusCode: 200, body: 'OK' }
}

async function processPush (push:PushRequest, userID:string) {
    const t0 = Date.now()
    // Batch all mutations into one transaction. ReplicacheTransaction caches
    // reads and changes in memory, we will flush them all together at end of tx.
    await tx(async (executor) => {
        const clientGroup = await ensureClientGroup(
            executor,
            push.clientGroupID,
            userID
        )

        // Since all mutations are within one transaction, we can just increment
        // the global version once.
        const prevVersion = await getGlobalVersion(executor)
        const nextVersion = prevVersion + 1

        const storage = new PostgresStorage(nextVersion, executor)
        const tx = new ReplicacheTransaction(storage)
        const clients = new Map<string, Client>()

        for (let i = 0; i < push.mutations.length; i++) {
            const mutation = push.mutations[i]
            const { id, clientID } = mutation

            let client = clients.get(clientID)
            if (client === undefined) {
                client = await ensureClient(
                    executor,
                    clientID,
                    clientGroup.id,
                    nextVersion,
                    id
                )

                clients.set(clientID, client)
            }

            const expectedMutationID = client.lastMutationID + 1

            if (id < expectedMutationID) {
                console.log(`Mutation ${id} has already been processed - skipping`)
                continue
            }

            if (id > expectedMutationID) {
                throw new Error(
            `Mutation ${id} is from the future. Perhaps the server state was deleted? ` +
              'If so, clear application storage in browser and refresh.'
                )
            }

            const t1 = Date.now()
            const mutator = mutators[mutation.name]
            if (!mutator) {
                console.error(`Unknown mutator: ${mutation.name} - skipping`)
            }

            try {
                await mutator(tx, mutation.args)
            } catch (e) {
                console.error(
            `Error executing mutator: __${JSON.stringify(mutator) || mutator.name}__: ${e}`
                )
            }

            client.lastMutationID = expectedMutationID
            client.lastModifiedVersion = nextVersion
            console.log('Processed mutation in', Date.now() - t1)
        }

        await Promise.all([
            ...[...clients.values()].map((c) => updateClient(executor, c)),
            setGlobalVersion(executor, nextVersion),
            tx.flush(),
        ])

        await sendPoke()
    })

    console.log('Processed all mutations in', Date.now() - t0)
}

async function ensureClientGroup (
    executor: Executor,
    id: string,
    userID: string
) {
    const clientGroup = await getClientGroup(executor, id)
    if (clientGroup) {
        // Users can only access their own groups.
        if (clientGroup.userID !== userID) {
            throw authError
        }
        return clientGroup
    }

    return await createClientGroup(executor, id, userID)
}

async function ensureClient (
    executor: Executor,
    id: string,
    clientGroupID: string,
    lastModifiedVersion: number,
    mutationID: number
): Promise<Client> {
    const client = await getClient(executor, id)
    if (client) {
        // If this client isn't from clientGroup we've auth'd, then user cannot
        // access it.
        if (client.clientGroupID !== clientGroupID) {
            throw authError
        }
        return client
    }

    // If mutationID isn't 1, then this isn't a new client. We should have found
    // the client record.
    if (mutationID !== 1) {
        throw clientStateNotFoundError
    }

    return (await createClient(executor, id, clientGroupID, lastModifiedVersion))
}

/**
 * @TODO
 */
async function sendPoke () {
    const pusher = new Pusher({
        appId: process.env.PUSHER_APP_ID!,
        key: process.env.PUSHER_KEY!,
        secret: process.env.PUSHER_SECRET!,
        cluster: process.env.PUSHER_CLUSTER!,
        useTLS: true,
    })
    const t0 = Date.now()
    await pusher.trigger('default', 'poke', {})
    console.log('Sent poke in', Date.now() - t0)
}
