import { html } from 'htm/preact'

export function MessageList ({ messages }) {
    return html`<ul>
        ${messages.map(([_, v]) => {
            return (html`<div key={k}>
                <b>${v.from}: </b>
                ${v.content}
            </div>`)
        })}
    </ul> `
}
