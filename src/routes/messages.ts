import { html } from 'htm/preact'
import { State } from '../state.js'
import { FunctionComponent } from 'preact'
import Debug from '@nichoth/debug'

const debug = Debug('view')

export const MessageRoute:FunctionComponent<{
    state:Awaited<ReturnType<typeof State>>
}> = function ({ state }) {
    return html`<div class="message route">
        <${MessageList} messages=${state.messages} />
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
