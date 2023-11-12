import { Handler, HandlerEvent } from '@netlify/functions'

export const handler:Handler = async function handler (ev:HandlerEvent) {
    return {
        statusCode: 200,
        body: JSON.stringify({
            // We will discuss these two fields in later steps.
            lastMutationIDChanges: {},
            cookie: 42,
            patch: [
                { op: 'clear' },
                {
                    op: 'put',
                    key: 'message/qpdgkvpb9ao',
                    value: {
                        from: 'Jane',
                        content: "Hey, what's for lunch?",
                        order: 1,
                    },
                },
                {
                    op: 'put',
                    key: 'message/5ahljadc408',
                    value: {
                        from: 'Fred',
                        content: 'tacos?',
                        order: 2,
                    },
                },
            ],
        })
    }
}
