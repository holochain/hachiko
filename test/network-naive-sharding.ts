import * as sinon from 'sinon'
import * as _ from 'lodash'

import { FullSyncNetwork, Waiter, NaiveShardedNetwork } from '../src/index'
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

const testNodes = new Set(_.range(0, 100).map(String))
const testNetwork = () => new NaiveShardedNetwork(3, [...testNodes])

test('NaiveShardedNetwork', ({test}) => {
  test('numValidators', t => {
    const net42 = new NaiveShardedNetwork(4, ['a', 'b'])
    const net43 = new NaiveShardedNetwork(4, ['a', 'b', 'c'])
    const net24 = new NaiveShardedNetwork(2, ['a', 'b', 'c', 'd'])
    const net34 = new NaiveShardedNetwork(3, ['a', 'b', 'c', 'd'])
    const net44 = new NaiveShardedNetwork(4, ['a', 'b', 'c', 'd'])
    const net4_100 = new NaiveShardedNetwork(4, _.range(0, 100).map(String))
    t.equal(net42.numValidators(), 2)
    t.equal(net43.numValidators(), 3)
    t.equal(net24.numValidators(), 2)
    t.equal(net34.numValidators(), 3)
    t.equal(net44.numValidators(), 4)
    t.equal(net4_100.numValidators(), 4)

    t.end()
  })

  test('consistency', t => {
    const network = testNetwork()

    network.consumeSignal('0', signal('x', [pending('Validators', 'y')]))
    t.equal(network.numEventsAwaiting(), 3)

    network.consumeSignal('0', signal('y', []))
    t.equal(network.numEventsAwaiting(), 2)

    network.consumeSignal('1', signal('y', []))
    t.equal(network.numEventsAwaiting(), 1)
    t.notOk(network.isConsistent())

    network.consumeSignal('2', signal('y', []))
    t.equal(network.numEventsAwaiting(), 0)
    t.ok(network.isConsistent())

    network.consumeSignal('4', signal('z', [pending('Validators', 'w')]))
    t.equal(network.numEventsAwaiting(), 3)
    t.notOk(network.isConsistent())

    network.consumeSignal('3', signal('y', []))
    t.equal(network.numEventsAwaiting(), 3)
    t.notOk(network.isConsistent())

    t.end()
  })
})