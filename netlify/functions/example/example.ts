import { Handler, HandlerEvent } from '@netlify/functions'

export const handler:Handler = async function handler (ev:HandlerEvent) {
    return { statusCode: 200, body: 'hello' }
}
