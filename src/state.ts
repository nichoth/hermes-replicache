import { Signal, signal } from '@preact/signals'
import Route from 'route-event'
import { Replicache } from 'replicache'
import Debug from '@nichoth/debug'
import { nanoid } from 'nanoid'
import { LICENSE_KEY } from './license.js'
import { initSpace } from './space.js'
import { Message } from './types.js'
import { mutators } from './mutators.js'

const debug = Debug('state')

// this is the demo backend that works with a limited counter app
const SERVER_URL = 'https://replicache-counter-pr-6.onrender.com'

/**
 * Setup state
 *   - routes
 *   - replicache
 */
export async function State ():Promise<{
    route:Signal<string>;
    count:Signal<number>;
    idbName:Signal<string>;
    messages:Signal<[string, Message][]|null>;
    _replicache:InstanceType<typeof Replicache>;
    _setRoute:(path:string)=>void;
}> {  // eslint-disable-line indent
    const onRoute = Route()
    const spaceID = await initSpace(SERVER_URL, onRoute.setRoute.bind(onRoute))

    const replicache = new Replicache({
        name: `alice:${spaceID}`,
        licenseKey: LICENSE_KEY,
        // pushURL: `${SERVER_URL}/api/replicache/push?spaceID=${spaceID}`,
        // pullURL: `${SERVER_URL}/api/replicache/pull?spaceID=${spaceID}`,
        pushURL: '/api/replicache-push',  // <- for localhost server
        pullURL: '/api/replicache-pull',
        mutators
    })

    const eventUrl = SERVER_URL + '/api/replicache/poke?spaceID=' + spaceID

    // Replicache "poke" using Server-Sent Events.
    // If a "poke" message is received, it will pull from the server.
    const ev = new EventSource(eventUrl, { withCredentials: false })
    ev.onmessage = async (event) => {
        debug('event', event)

        if (event.data === 'poke') {
            debug('poke', event)
            await replicache.pull()
        }
    }

    const state = {
        _setRoute: onRoute.setRoute.bind(onRoute),
        _replicache: replicache,
        idbName: signal<string>(replicache.idbName),
        messages: signal<[string, Message][]|null>(null),
        count: signal<number>(0),
        route: signal<string>(location.pathname + location.search)
    }

    // @ts-ignore
    window.state = state

    replicache.subscribe(async (tx) => (await tx.get('count')) ?? '0', {
        onData: (count) => {
            debug('onData', count)
            state.count.value = parseInt(count as string)
        }
    })

    replicache.subscribe(
        async (tx) => {
            const list = (await tx
                .scan({ prefix: 'message/' })
                .entries()
                .toArray()
            ) as [string, Message][]
            list.sort(([, { order: a }], [, { order: b }]) => a - b)

            return list
        },
        {
            onData: messages => {
                debug('messages subscription', messages)
                state.messages.value = messages
            }
        }
    )

    // routes
    onRoute((path:string) => {
        state.route.value = path
    })

    return state
}

/**
 * Mutations must go through replicache
 */
State.Increase = function Increase (state:Awaited<ReturnType<typeof State>>) {
    state._replicache.mutate.increment(1)
}

State.Decrease = function Decrease (state:Awaited<ReturnType<typeof State>>) {
    state._replicache.mutate.decrement(1)
}

State.SendMessage = function SendMessage (
    state:Awaited<ReturnType<typeof State>>,
    msg:string,
    from:string
) {
    const last = (state.messages.value && (state.messages.value).length &&
        state.messages.value[state.messages.value.length - 1][1])
    const order = ((last && last.order) ?? 0) + 1

    state._replicache.mutate.createMessage({
        id: nanoid(),
        from,
        content: msg,
        order
    })
}
