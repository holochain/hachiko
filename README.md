# hachikō

[![CircleCI](https://circleci.com/gh/holochain/hachiko.svg?style=svg)](https://circleci.com/gh/holochain/hachiko)

<a href="https://en.wikipedia.org/wiki/Hachik%C5%8D"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Hachiko_Statue%2C_Shibuya.jpg/1024px-Hachiko_Statue%2C_Shibuya.jpg" height="250"/></a>


A Waiter is a little helper that hooks into Holochain's [consistency signals](https://github.com/holochain/holochain-rust/pull/1431). Hachiko is an implementation of such a Waiter. You can register a callback with Hachiko, and that callback will be called only when certain consistency conditions have been met. See the [tests](./test/index.ts) for thorough usage examples.


## Invariants

- `NodeId`s must be unique within a given `Waiter`