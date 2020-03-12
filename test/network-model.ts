import * as sinon from 'sinon'

import { FullSyncNetwork, Waiter } from '../src/index'
import {
  test,
  signal,
  pending,
  testCallback,
  testCallbackRealTimeout,
  testWaiter as makeTestWaiter,
  resolved,
  rejected,
  notCalled,
  withClock,
} from './common'

const testNodes = ['lorka', 'manuele', 'nicole']
const testNetwork = () => new FullSyncNetwork([...testNodes])

test('Network can be initialized with nodes', t => {
  const network = new FullSyncNetwork(['a', 'b', 'c'])
  t.equal(network.nodes.size, 3)
  t.end()
})

test('Network consumes signals', t => {
  const network = testNetwork()

  network.consumeSignal('lorka', signal('x', [pending('Validators', 'y')]))
  t.deepEqual(network.eventDiffArray(), {
    y: testNodes
  })
  t.equal(network.numEventsAwaiting(), 3)
  t.end()
})

test('Network ignores some signals', t => {
  const network = testNetwork()

  network.consumeSignal('lorka', signal('x', [pending('Validators', 'y')]))
  network.consumeSignal('manuele', signal('y', []))
  t.deepEqual(network.eventDiffArray(), {
    y: ['lorka', 'nicole']
  })
  t.equal(network.numEventsAwaiting(), 2)

  network.ignorePending()
  t.deepEqual(network.ignoredPendingObservationsArray(), {
    y: ['lorka', 'nicole']
  })
  t.deepEqual(network.eventDiffArray(), {})
  t.equal(network.numEventsAwaiting(), 0)

  // if the same signal is repeated, nothing should be pending,
  // because they are all either already processed, or ignored now
  network.consumeSignal('lorka', signal('x', [pending('Validators', 'y')]))
  t.deepEqual(network.eventDiffArray(), {})
  t.equal(network.numEventsAwaiting(), 0)

  t.end()
})
