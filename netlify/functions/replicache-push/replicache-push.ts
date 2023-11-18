import { Handler, HandlerEvent } from '@netlify/functions'
import { ReplicacheTransaction } from 'replicache-transaction'
import { Executor, tx, getGlobalVersion, PostgresStorage } from '../db.js'
import { getClientGroup, headers } from '../util.js'
import { getClient, createClient, updateClient, setGlobalVersion } from '../data.js'
import { z } from 'zod'
import Debug from '@nichoth/debug'

// const debug = Debug()
// const authError = {}
// const clientStateNotFoundError = {}

// /**
//  * ...Refactoring to use supabase...
//  */

// type Message = {
//     from: string;
//     content: string;
//     order: number;
// };

// type MessageWithID = Message & { id: string };

// const mutationSchema = z.object({
//     id: z.number(),
//     clientID: z.string(),
//     name: z.string(),
//     args: z.any(),
// })

// const pushRequestSchema = z.object({
//     clientGroupID: z.string(),
//     mutations: z.array(mutationSchema),
// })

// type PushRequest = z.infer<typeof pushRequestSchema>;

// export const handler:Handler = async function (ev:HandlerEvent) {
//     if (!ev.body) return { statusCode: 400, headers }
//     const userID = (ev.headers.cookie && ev.headers.cookie['userID']) || 'anon'
//     const body = JSON.parse(ev.body)

//     debug('Processing push ' + JSON.stringify(body, null, 2))

//     const push = pushRequestSchema.parse(body)

//     try {
//         await processPush(push, userID)
//     } catch (err) {
//         if (!(err instanceof Error)) return { statusCode: 500, headers }
//         /**
//          * @TODO handle errors
//          * see example https://github.com/rocicorp/todo-nextjs/blob/main/pages/api/replicache/push.ts#L45
//          */
//         return { statusCode: 500, headers, body: err.toString() }
//     }

//     return { statusCode: 200, body: 'OK' }
// }

// async function processPush (push: PushRequest, userID: string) {
//     const t0 = Date.now()
//     // Batch all mutations into one transaction. ReplicacheTransaction caches
//     // reads and changes in memory, we will flush them all together at end of tx.
//     await tx(async (executor) => {
//         const clientGroup = await ensureClientGroup(
//             executor,
//             push.clientGroupID,
//             userID
//         )

//         // Since all mutations within one transaction, we can just increment the
//         // global version once.
//         const prevVersion = await getGlobalVersion(executor)
//         const nextVersion = prevVersion + 1
//         console.log('nextVersion: ', nextVersion)

//         const storage = new PostgresStorage(nextVersion, executor)
//         const tx = new ReplicacheTransaction(storage)
//         const clients = new Map<string, Client>()

//         for (let i = 0; i < push.mutations.length; i++) {
//             const mutation = push.mutations[i]
//             const { id, clientID } = mutation

//             let client = clients.get(clientID)
//             if (client === undefined) {
//                 client = await ensureClient(
//                     executor,
//                     clientID,
//                     clientGroup.id,
//                     nextVersion,
//                     id
//                 )
//                 clients.set(clientID, client)
//             }

//             const expectedMutationID = client.lastMutationID + 1

//             if (id < expectedMutationID) {
//                 console.log(`Mutation ${id} has already been processed - skipping`)
//                 continue
//             }

//             if (id > expectedMutationID) {
//                 throw new Error(
//             `Mutation ${id} is from the future. Perhaps the server state was deleted? ` +
//               'If so, clear application storage in browser and refresh.'
//                 )
//             }

//             console.log('Processing mutation:', JSON.stringify(mutation, null, ''))

//             const t1 = Date.now()
//             const mutator = (mutators as any)[mutation.name]
//             if (!mutator) {
//                 console.error(`Unknown mutator: ${mutation.name} - skipping`)
//             }

//             try {
//                 await mutator(tx, mutation.args)
//             } catch (e) {
//                 console.error(
//             `Error executing mutator: ${JSON.stringify(mutator)}: ${e}`
//                 )
//             }

//             client.lastMutationID = expectedMutationID
//             client.lastModifiedVersion = nextVersion
//             console.log('Processed mutation in', Date.now() - t1)
//         }

//         await Promise.all([
//             ...[...clients.values()].map((c) => updateClient(executor, c)),
//             setGlobalVersion(executor, nextVersion),
//             tx.flush(),
//         ])

//         // No need to explicitly poke, Supabase realtime stuff will fire a change
//         // because the space table changed.
//     })

//     console.log('Processed all mutations in', Date.now() - t0)
// }

// async function ensureClientGroup (
//     executor: Executor,
//     id: string,
//     userID: string
// ) {
//     const clientGroup = await getClientGroup(executor, id)
//     if (clientGroup) {
//         // Users can only access their own groups.
//         if (clientGroup.userID !== userID) {
//             throw authError
//         }
//         return clientGroup
//     }

//     return await createClientGroup(executor, id, userID)
// }

// async function ensureClient (
//     executor: Executor,
//     id: string,
//     clientGroupID: string,
//     lastModifiedVersion: number,
//     mutationID: number
// ): Promise<Client> {
//     const c = await getClient(executor, id)
//     if (c) {
//         // If this client isn't from clientGroup we've auth'd, then user cannot
//         // access it.
//         if (c.clientGroupID !== clientGroupID) {
//             throw authError
//         }
//         return c
//     }

//     // If mutationID isn't 1, then this isn't a new client. We should have found
//     // the client record.
//     if (mutationID !== 1) {
//         throw clientStateNotFoundError
//     }

//     return (await createClient(executor, id, clientGroupID, lastModifiedVersion))
// }
