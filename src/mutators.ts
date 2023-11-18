import { MessageWithID } from './types.js'
import { WriteTransaction } from 'replicache'

export const mutators = {
    increment: async (tx, delta) => {
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
    },

    createMessage: async function (
        tx:WriteTransaction,
        { id, from, content, order }:MessageWithID
    ) {
        await tx.put(`message/${id}`, {
            from,
            content,
            order,
        })
    },
}
