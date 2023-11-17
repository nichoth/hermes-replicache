# replicache demo [![Netlify Status](https://api.netlify.com/api/v1/badges/6c0bb17d-79b5-426e-bfe4-257d5dcf7f79/deploy-status)](https://app.netlify.com/sites/hermes-replicache/deploys)

Trying replicache.

[See this demo live](https://hermes-replicache.netlify.app/)

Create application state & a replicache instance in the file [./src/state.ts](./src/state.ts). This is where we create methods for the view to call, and subscribe to replicache.

The view is made with [preact](https://preactjs.com/).

In the view code, we call the `State.Method` functions with a state instance. In the state functions we call "mutators" on replicache.

-------

[See docs](https://doc.replicache.dev/byob/render-ui) for reference about making the backend.

## develop
```sh
npm start
```

-------

## database

There is also the issue to consider of how the pokes are going to work on netlify.

In a serverless platform you can't use server-sent events like todo-row-versioning does.

What todo-nextjs does is use supabase both for the database and the poke (via supabase's realtime features). If you like supabase then you could do exact same thing -- just rip the database stuff out of todo-nextjs and add to todo-row-versioning.

If you do not want to use supabase, then you could use some other postgres and something like pusherjs for the pokes.
Summing up, I think you probably don't want to use pg-mem if you're using netlify.

## poke

[See docs](https://doc.replicache.dev/byob/poke)
