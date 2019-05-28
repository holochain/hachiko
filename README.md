# scenario-waiter

[![CircleCI](https://circleci.com/gh/holochain/scenario-waiter.svg?style=svg)](https://circleci.com/gh/holochain/scenario-waiter)

A Waiter is a little helper that hooks into Holochain's [consistency signals](https://github.com/holochain/holochain-rust/pull/1431). You can register a callback with a Waiter, and that callback will be called only when certain consistency conditions have been met. See the [tests](./test/index.ts) for thorough usage examples.