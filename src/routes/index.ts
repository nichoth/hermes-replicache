import { html } from 'htm/preact'
import Router from '@nichoth/routes'
import { HomeRoute } from './home.js'
import { SpaceRoute } from './space.js'
import { MessageRoute } from './messages.js'

export default function _Router ():ReturnType<Router> {
    const router = Router()

    router.addRoute('/', () => {
        return HomeRoute
    })

    router.addRoute('/aaa', () => {
        return () => {
            return html`<h2>aaa</h2>`
        }
    })

    router.addRoute('/bbb', () => {
        return () => {
            return html`<h2>bbb</h2>`
        }
    })

    router.addRoute('/ccc', () => {
        return () => {
            return html`<h2>ccc</h2>`
        }
    })

    router.addRoute('/space/:spaceId', () => {
        return SpaceRoute
    })

    router.addRoute('/messages', () => {
        return MessageRoute
    })

    return router
}
