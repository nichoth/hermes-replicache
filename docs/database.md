# database

[See discord chat](https://discord.com/channels/830183651022471199/1173725141671354378/1174587745964929064)

There is also the issue to consider of how the pokes are going to work on netlify.

In a serverless platform you can't use server-sent events like todo-row-versioning does.

What [todo-nextjs](https://github.com/rocicorp/todo-nextjs) does is use supabase both for the database and the poke (via supabase's realtime features). If you like supabase then you could do exact same thing -- just rip the database stuff out of todo-nextjs and add to todo-row-versioning.

If you do not want to use supabase, then you could use some other postgres and something like pusherjs for the pokes.
Summing up, I think you probably don't want to use pg-mem if you're using netlify.

## poke

[See docs](https://doc.replicache.dev/byob/poke)

## in progress
[serverside pull function](https://doc.replicache.dev/byob/dynamic-pull#implement-pull)
