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


test('soft timeout', withClock(async (t, clk) => {
  const waiter = testWaiter({softTimeout: 2000, hardTimeout: 6000})
  waiter.handleObservation(observation('kristina', signal('x', [pending('Source', 'y')])))
  const cb0 = waiter.registerCallback(testCallback(null))!
  t.equal(waiter.callbacks.length, 1)
  clk.tick(1000)
  t.notCalled(cb0.onSoftTimeout)
  clk.tick(1001)
  t.called(cb0.onSoftTimeout)

  t.end()
}))
