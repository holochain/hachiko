import * as tape from 'tape'
import * as sinon from 'sinon'

import { FullSyncNetwork, Waiter, Signal, EffectAbstract } from '../src/index'
import logger from '../src/logger'

const runTest = runner => (desc, f) => {
  runner(desc, t => {
    // smush sinon.assert and tape API into a single object
    const s = sinon.assert
    s.pass = t.pass
    s.fail = t.fail
    f(Object.assign({}, t, s))
  })
}

export const test: any = runTest(tape)
test.only = runTest(tape.only)
test.skip = runTest((desc, t) => {
  logger.warn("Skipping test: %s", desc)
  return tape.skip(desc, t)
})

export const withClock = f => {
  return t => {
    const clock = sinon.useFakeTimers()
    try {
      f(t, clock)
    } finally {
      clock.runAll()
      clock.restore()
    }
  }
}


export const signal = (event, pending): Signal => ({ event, pending })
export const pending = (group, event): EffectAbstract => ({ group, event })
export const testCallbackRealTimeout = (waiter, nodes) => {
  const cb = waiter.registerCallback({
    resolve: sinon.spy(),
    reject: sinon.spy(),
    nodes
  })
  return cb
}
export const testCallback = (waiter, nodes) => {
  const cb = testCallbackRealTimeout(waiter, nodes)
  cb._onSoftTimeout = sinon.spy()
  cb._onHardTimeout = sinon.spy()
  return cb
}

export const TIMEOUTS = {
  soft: 1000,
  hard: 10000,
}

export const testWaiter = (agents, opts?) => {
  const options = Object.assign({}, {
    softTimeout: TIMEOUTS.soft,
    hardTimeout: TIMEOUTS.hard,
  }, opts || {})
  const network = new FullSyncNetwork(agents)
  const waiter = new Waiter(nodes => new FullSyncNetwork(nodes), { testnet: network }, options)
  return waiter
}


export const resolved = (t, tc) => {
  t.calledOnce(tc.cb.resolve)
  t.notCalled(tc.cb.reject)
}
export const rejected = (t, tc) => {
  t.notCalled(tc.cb.resolve)
  t.calledOnce(tc.cb.reject)
}
export const notCalled = (t, tc) => {
  t.notCalled(tc.cb.resolve)
  t.notCalled(tc.cb.reject)
}
