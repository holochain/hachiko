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

const testNodes = new Set(['lorka', 'manuele', 'nicole'])
const testNetwork = () => new FullSyncNetwork([...testNodes])

test('Network can be initialized with nodes', t => {
  const network = new FullSyncNetwork(['a', 'b', 'c'])
  t.equal(network.nodes.size, 3)
  t.end()
})

test('Network consumes signals', t => {
  const network = testNetwork()

  network.consumeSignal('lorka', signal('x', [pending('Validators', 'y')]))
  t.deepEqual(network.eventDiff(), {
    y: testNodes
  })
  t.equal(network.numEventsAwaiting(), 3)
  t.end()
})
