import { html } from 'htm/preact'
import { render } from 'preact'
import {
    Primary as ButtonOutlinePrimary,
    ButtonOutline
} from '@nichoth/components/htm/button-outline'
import { State } from './state.js'
import Router from './routes/index.js'
import '@nichoth/components/button-outline.css'
import './style.css'

const router = Router()
const state = await State()

export function Example () {
    const match = router.match(state.route.value)

    if (!match) {
        return html`<div class="404">
            <h1>404</h1>
        </div>`
    }

    const ChildNode = match.action(match, state.route)

    function plus (ev) {
        ev.preventDefault()
        State.Increase(state)
    }

    function minus (ev) {
        ev.preventDefault()
        State.Decrease(state)
    }

    return html`<div>
        <h1>hello</h1>

        <ul class="nav">
            <li class=${getClass('/aaa')}><a href="/aaa">aaa</a></li>
            <li class=${getClass('/bbb')}><a href="/bbb">bbb</a></li>
            <li class=${getClass('/ccc')}><a href="/ccc">ccc</a></li>
            <li class=${getClass('/messages')}>
                <a href="/messages">messages</a>
            </li>
        </ul>

        <div>
            <div><strong>count: </strong>${state.count.value}</div>
            <div><strong>idbName: </strong>${state.idbName.value}</div>
            <ul class="count-controls">
                <li>
                    <${ButtonOutlinePrimary} onClick=${plus}>
                        plus
                    </${ButtonOutline}>
                </li>
                <li>
                    <${ButtonOutline} onClick=${minus}>
                        minus
                    </${ButtonOutline}>
                </li>
            </ul>
        </div>

        <${ChildNode} state=${state} params=${match.params} />
    </div>`
}

render(html`<${Example} />`, document.getElementById('root')!)

function getClass (linkHref:string):string {
    return location.pathname.includes(linkHref) ? 'active' : ''
}
