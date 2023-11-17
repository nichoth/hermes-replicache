import { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions'
import { headers } from '../util.js'
import { serverID, tx } from '../db.js'
import { ITask } from 'pg-promise'
import { ReadonlyJSONValue, PullResponse } from 'replicache'

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

    const pull = JSON.parse(ev.body)
    console.log('Processing pull', JSON.stringify(pull))
    const { clientGroupID } = pull
    const fromVersion = parseInt(pull.cookie) ?? 0
    const t0 = Date.now()

    let res:HandlerResponse

    try {
        // Read all data in a single transaction so it's consistent.
        await tx(async t => {
            // Get current version.
            const { version: currentVersion } = await t.one<{version: number}>(
                'select version from replicache_server where id = $1',
                serverID,
            )

            if (fromVersion > currentVersion) {
                throw new Error(
                    `fromVersion ${fromVersion} is from the future - aborting. This can happen in development if the server restarts. In that case, clear appliation data in browser and refresh.`,
                )
            }

            // Get lmids for requesting client groups.
            const lastMutationIDChanges = await getLastMutationIDChanges(
                t,
                clientGroupID,
                fromVersion,
            )

            // Get changed domain objects since requested version.
            const changed = await t.manyOrNone<{
                id: string;
                sender: string;
                content: string;
                ord: number;
                version: number;
                deleted: boolean;
            }>(
                'select id, sender, content, ord, version, deleted from message where version > $1',
                fromVersion,
            )

            // Build and return response.
            // const patch:{ op:string, key:string, value? }[] = []
            const patch:{
                op: 'put'|'del';
                key: string;
                value?: ReadonlyJSONValue;
            }[] = []

            for (const row of changed) {
                const { id, sender, content, ord, version: rowVersion, deleted } = row
                if (deleted) {
                    if (rowVersion > fromVersion) {
                        patch.push({
                            op: 'del',
                            key: `message/${id}`,
                        })
                    }
                } else {
                    patch.push({
                        op: 'put',
                        key: `message/${id}`,
                        value: {
                            from: sender,
                            content: content,
                            order: ord,
                        },
                    })
                }
            }

            const body:PullResponse = {
                lastMutationIDChanges: lastMutationIDChanges ?? {},
                cookie: currentVersion,
                patch,
            }

            res = { statusCode: 200, headers, body: JSON.stringify(body) }
        })

        return res!
    } catch (err) {
        console.error(err)
        return { statusCode: 500, headers, body: err.toString() }
    } finally {
        console.log('Processed pull in', Date.now() - t0)
    }
}

async function getLastMutationIDChanges (
    t: ITask<{}>,
    clientGroupID: string,
    fromVersion: number,
) {
    /* eslint-disable camelcase */
    const rows = await t.manyOrNone<{id: string; last_mutation_id: number}>(
        `select id, last_mutation_id
        from replicache_client
        where client_group_id = $1 and version > $2`,
        [clientGroupID, fromVersion],
    )

    return Object.fromEntries(rows.map(r => [r.id, r.last_mutation_id]))
}
