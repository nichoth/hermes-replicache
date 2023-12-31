# replicache demo [![Netlify Status](https://api.netlify.com/api/v1/badges/6c0bb17d-79b5-426e-bfe4-257d5dcf7f79/deploy-status)](https://app.netlify.com/sites/hermes-replicache/deploys)

Trying replicache.

This is using [netlify](https://www.netlify.com/) as host, and [supabase](https://supabase.com/) as a DB.

[See this demo live](https://hermes-replicache.netlify.app/)

## develop
```sh
npm start
```

## configure
Create a `.env` file with these variables:

```sh
VITE_DEBUG="state,view"
SUPABASE_ANON_KEY="eyJhbG..."
SUPABASE_DATABASE_PASSWORD="my password here"
SUPABASE_URL="https://my-url.supabase.co"
PUSHER_APP_ID="1234567"
PUSHER_KEY="123abc"
PUSHER_SECRET="123abc"
PUSHER_CLUSTER="us3"
```

You will need to create a [supabase](https://supabase.com/).

## frontend architecture

Create application state & a replicache instance in the file [./src/state.ts](./src/state.ts). This is where we subscribe to replicache, and create methods that are called by the view.

The view is made with [preact](https://preactjs.com/).

In the view code, we call the `State.Method` functions with a state instance. In the state functions we call "mutators" on replicache.

## Replicache
[See docs](https://doc.replicache.dev/byob/render-ui) for reference about making the backend.
