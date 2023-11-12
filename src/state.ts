import { Signal, signal } from '@preact/signals'
import Route from 'route-event'
import { Replicache } from 'replicache'
import Debug from '@nichoth/debug'
import { LICENSE_KEY } from './license.js'
import { initSpace } from './space.js'

const debug = Debug('state')
const serverURL = 'https://replicache-counter-pr-6.onrender.com'

/**
 * Setup state
 *   - routes
 *   - replicache
 */
export async function State ():Promise<{
    route:Signal<string>;
    count:Signal<number>;
    idbName:Signal<string>;
    _replicache:InstanceType<typeof Replicache>;
    _setRoute:(path:string)=>void;
}> {  // eslint-disable-line indent
    const onRoute = Route()

    const spaceID = await initSpace(serverURL)

    const replicache = new Replicache({
        name: `alice:${spaceID}`,
        licenseKey: LICENSE_KEY,
        pushURL: `${serverURL}/api/replicache/push?spaceID=${spaceID}`,
        pullURL: `${serverURL}/api/replicache/pull?spaceID=${spaceID}`,
        mutators: {
            increment: async (tx, delta) => {
                // Despite 'await', this almost always responds instantly.
                // Same with `put` below.
                const prev = (await tx.get('count')) ?? 0
                const next = prev + delta
                await tx.put('count', next)
                return next
            },

            decrement: async (tx, delta) => {
                const prev = (await tx.get('count')) ?? 0
                const next = prev - delta
                await tx.put('count', next)
                tx.put('count', prev - delta)
                return next
            }
        }
    })

    debug('replicache', replicache)

    // Implements a Replicache poke using Server-Sent Events.
    // If a "poke" message is received, it will pull from the server.
    const ev = new EventSource(
        serverURL + '/api/replicache/poke?spaceID=' + spaceID,
        {
            withCredentials: false
        }
    )
    ev.onmessage = async (event) => {
        if (event.data === 'poke') {
            await replicache.pull()
        }
    }

    const state = {
        _setRoute: onRoute.setRoute.bind(onRoute),
        _replicache: replicache,
        idbName: signal<string>(replicache.idbName),
        count: signal<number>(0),
        route: signal<string>(location.pathname + location.search)
    }

    replicache.subscribe(async (tx) => (await tx.get('count')) ?? '0', {
        onData: (count) => {
            console.log('onData', count)
            state.count.value = parseInt(count as string)
        }
    })

    // routes
    onRoute((path:string) => {
        state.route.value = path
    })

    return state
}

/**
 * In functions, mutations must go through replicache
 */

State.Increase = function Increase (state:Awaited<ReturnType<typeof State>>) {
    state._replicache.mutate.increment(1)
}

State.Decrease = function Decrease (state:Awaited<ReturnType<typeof State>>) {
    state._replicache.mutate.decrement(1)
}
