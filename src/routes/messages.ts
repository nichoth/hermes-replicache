import { html } from 'htm/preact'
import { State } from '../state.js'
import { FunctionComponent } from 'preact'
import Debug from '@nichoth/debug'

const debug = Debug('view')

export const MessageRoute:FunctionComponent<{
    state:Awaited<ReturnType<typeof State>>
}> = function ({ state }) {
    function onSubmit (ev) {
        ev.preventDefault()
        debug('submit event', ev)
    }

    return html`<div class="message route">
        <div>
            <form onSubmit=${onSubmit}>
                <input required /> says:${' '}
                <input required />
                <input type="submit" />
            </form>

            <${MessageList} messages=${state.messages} />
        </div>
    </div>`
}

function MessageList ({ messages }) {
    debug('messages', messages.value)

    return html`<ul class="message list">
        ${messages.value.map(([k, v]) => {
            return (html`<li key=${k}>
                <b>${v.from}: </b>
                ${v.content}
            </li>`)
        })}
    </ul> `
}
