# replicache demo

Trying replicache.

Create application state & a replicache instance in the file [./src/state.ts](./src/state.ts). This is where we export static functions and subscribe to replicache.

The view is made with [preact](https://preactjs.com/).

In the view code, we call the `State.Method` functions with a state instance. In the state functions we call "mutators" on replicache.
