import { Handler, HandlerEvent } from '@netlify/functions'
import { PullResponse } from 'replicache'
import { z } from 'zod'
import {
    getChangedEntries,
    getChangedLastMutationIDs,
    getClientGroup,
    getGlobalVersion,
} from '../data.js'
import { headers } from '../util.js'
import { tx } from '../db.js'

const pullRequestSchema = z.object({
    clientGroupID: z.string(),
    cookie: z.union([z.number(), z.null()]),
})

type PullRequest = z.infer<typeof pullRequestSchema>;
const authError = {}

export const handler:Handler = async function handler (ev:HandlerEvent) {
    if (ev.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers }
    }

    if (!ev.body) {
        return {
            statusCode: 400,
            headers,
            body: 'missing request body'
        }
    }

    const userID = ((ev.headers.cookies && ev.headers.cookies['userID']) || 'anon')
    const body = JSON.parse(ev.body)
    const pullRequest = pullRequestSchema.parse(body)

    console.log('Processing pull', ev.body)

    try {
        const pullResponse = await processPull(pullRequest, userID)
        return { statusCode: 200, headers, body: JSON.stringify(pullResponse) }
    } catch (err) {
        if (err === authError) {
            return { statusCode: 401, headers, body: 'Unauthorized' }
        } else {
            console.error('pull', err)
            return { statusCode: 500, headers, body: 'Error processing pull:' }
        }
    }
}

async function processPull (req:PullRequest, userID:string) {
    const { clientGroupID, cookie: requestCookie } = req

    const t0 = Date.now()

    const [entries, lastMutationIDChanges, responseCookie] = await tx(
        async (executor) => {
            const clientGroup = await getClientGroup(executor, req.clientGroupID)
            if (clientGroup && clientGroup.userID !== userID) {
                throw authError
            }

            return Promise.all([
                getChangedEntries(executor, requestCookie ?? 0),
                getChangedLastMutationIDs(executor, clientGroupID, requestCookie ?? 0),
                getGlobalVersion(executor),
            ])
        }
    )

    console.log('lastMutationIDChanges: ', lastMutationIDChanges)
    console.log('responseCookie: ', responseCookie)
    console.log('Read all objects in', Date.now() - t0)

    // TODO: Return ClientStateNotFound for Replicache 13 to handle case where
    // server state deleted.

    const res:PullResponse = {
        lastMutationIDChanges,
        cookie: responseCookie,
        patch: [],
    }

    for (const [key, value, deleted] of entries) {
        if (deleted) {
            res.patch.push({
                op: 'del',
                key,
            })
        } else {
            res.patch.push({
                op: 'put',
                key,
                value,
            })
        }
    }

    console.log('Returning', JSON.stringify(res, null, ''))
    return res
}
