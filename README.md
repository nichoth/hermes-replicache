# replicache demo [![Netlify Status](https://api.netlify.com/api/v1/badges/6c0bb17d-79b5-426e-bfe4-257d5dcf7f79/deploy-status)](https://app.netlify.com/sites/hermes-replicache/deploys)

Trying replicache.

[See this demo live](https://hermes-replicache.netlify.app/)

## develop
```sh
npm start
```

## frontend architecture

Create application state & a replicache instance in the file [./src/state.ts](./src/state.ts). This is where we create methods for the view to call, and subscribe to replicache.

The view is made with [preact](https://preactjs.com/).

In the view code, we call the `State.Method` functions with a state instance. In the state functions we call "mutators" on replicache.

## Replicache
[See docs](https://doc.replicache.dev/byob/render-ui) for reference about making the backend.
