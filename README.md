# replicache demo ![tests](https://github.com/nichoth/hermes-replicache/actions/workflows/nodejs.yml/badge.svg)

Trying replicache.

Create application state & a replicache instance in the file [./src/state.ts](./src/state.ts). This exports static functions, creates a state object, and sets up URL routing.

The view is made with [preact](https://preactjs.com/).

In the view code, we call the `State.Method` functions with a state instance. In the state functions we call "mutators" on replicache.
