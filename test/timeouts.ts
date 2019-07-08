import * as sinon from 'sinon'

import {test, observation, signal, pending, testCallback} from './common'
import {FullSyncNetwork, Waiter} from '../src/index'
import {TimedCallback} from '../src/callback'

const agents = ['kristina', 'gina']
const testWaiter = (opts) => {
  const network = new FullSyncNetwork(agents)
  const waiter = new Waiter({testnet: network}, opts)
  return waiter
}

const timerSandbox = sinon.createSandbox()
const withClock = f => {
  return t => {
    timerSandbox.stub(TimedCallback.prototype, 'onSoftTimeout')
    timerSandbox.stub(TimedCallback.prototype, 'onHardTimeout')
    const clock = sinon.useFakeTimers()
    try {
      f(t, clock)
    } finally {
      clock.restore()
      timerSandbox.restore()
    }
  }
}


test('soft timeout fires after one observation', withClock(async (t, clk) => {
  const waiter = testWaiter({softTimeout: 1000, hardTimeout: 2000})
  waiter.handleObservation(observation('kristina', signal('x', [pending('Source', 'y')])))
  const cb0 = waiter.registerCallback(testCallback(null))!
  t.equal(waiter.callbacks.length, 1)
  clk.tick(500)
  t.notCalled(cb0.onSoftTimeout)
  clk.tick(500)
  t.calledOnce(cb0.onSoftTimeout)
  clk.tick(10000)
  t.calledOnce(cb0.onSoftTimeout)
  t.end()
}))

test('hard timeout fires after one observation', withClock(async (t, clk) => {
  const waiter = testWaiter({softTimeout: 1000, hardTimeout: 2000})
  waiter.handleObservation(observation('kristina', signal('x', [pending('Source', 'y')])))
  const cb0 = waiter.registerCallback(testCallback(null))!
  t.equal(waiter.callbacks.length, 1)
  clk.tick(500)
  t.notCalled(cb0.onHardTimeout)
  clk.tick(1000)
  t.notCalled(cb0.onHardTimeout)
  clk.tick(1000)
  t.calledOnce(cb0.onHardTimeout)
  t.calledOnce(cb0.onSoftTimeout)
  t.end()
}))


test('timeouts reset with new relevant observations', withClock(async (t, clk) => {
  const waiter = testWaiter({softTimeout: 1000, hardTimeout: 2000})
  waiter.handleObservation(observation('kristina', signal('x', [pending('Validators', 'y')])))
  const cb0 = waiter.registerCallback(testCallback(null))!

  clk.tick(1000)
  // first soft timeout triggered
  t.callCount(cb0.onSoftTimeout, 1)

  // a new observation comes in, resetting all timers
  waiter.handleObservation(observation('kristina', signal('y', [])))

  clk.tick(500)
  t.callCount(cb0.onSoftTimeout, 1)

  clk.tick(500)
  // if that second observation hadn't happened, this would be when the hard timeout would occur
  t.notCalled(cb0.onHardTimeout)
  // instead, another soft timeout occurs
  t.callCount(cb0.onSoftTimeout, 2)

  // finally, the hard timeout interval has elasped since the last observation
  clk.tick(1000)
  t.callCount(cb0.onHardTimeout, 1)
  t.end()
}))

// test('timeouts do not reset due to irrelevant observations', withClock(async (t, clk) => {
//   const waiter = testWaiter({softTimeout: 1000, hardTimeout: 2000})
//   waiter.handleObservation(observation('kristina', signal('x', [pending('Source', 'y')])))
//   const cb0 = waiter.registerCallback(testCallback(null))!

//   clk.tick(1000)
//   // first soft timeout triggered
//   t.calledOnce(cb0.onSoftTimeout)

//   // a new observation comes in, resetting all timers
//   waiter.handleObservation(observation('gina', signal('x', [pending('Source', 'y')])))

//   clk.tick(1000)
//   t.calledOnce(cb0.onHardTimeout)

//   clk.tick(500)
//   // if that second observation hadn't happened, this would be when the hard timeout would occur
//   t.notCalled(cb0.onHardTimeout)
//   // instead, another soft timeout occurs
//   t.callCount(cb0.onSoftTimeout, 2)

//   // finally, the hard timeout interval has elasped since the last observation
//   clk.tick(1000)
//   t.callCount(cb0.onHardTimeout, 1)
//   t.end()
// }))
