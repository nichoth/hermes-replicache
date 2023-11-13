import { FunctionComponent } from 'preact'
import { html } from 'htm/preact'

export const SpaceRoute:FunctionComponent<{
    params
}> = function SpaceRoute ({ params }) {
    return html`<div class="route">
        <h2>the space route</h2>
        <strong>spaceId: </strong>
        <span>${params.spaceId}</span>
    </div>`
}
