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

const agents = ['autumn', 'mara', 'jill']
const observation = (node, signal) => ({ dna: 'testnet', node, signal })
const testWaiter = (opts?) => makeTestWaiter(agents, opts)

test('resolves immediately if nothing pending', t => {
  const waiter = testWaiter()
  const cb0 = testCallback(waiter, null)
  const cb1 = testCallback(waiter, ['autumn'])

  resolved(t, cb0)
  resolved(t, cb1)
  t.end()
})

test('resolves later if pending', t => {
  const waiter = testWaiter()

  waiter.handleObservation(observation('jill', signal('x', [pending('Source', 'y')])))
  const cb0 = testCallback(waiter, null)
  waiter.handleObservation(observation('autumn', signal('z', [])))
  notCalled(t, cb0)

  waiter.handleObservation(observation('jill', signal('y', [])))
  resolved(t, cb0)
  t.end()
})

test('soft timeout has no effect', t => {
  const waiter = testWaiter()

  waiter.handleObservation(observation('jill', signal('x', [pending('Source', 'y')])))
  const cb0 = testCallbackRealTimeout(waiter, null)
  waiter.handleObservation(observation('autumn', signal('z', [])))
  notCalled(t, cb0)

  cb0._onSoftTimeout()
  waiter.handleObservation(observation('jill', signal('y', [])))
  resolved(t, cb0)
  t.end()
})

test('hard timeout eventually resolves in non-strict mode', withClock((t, clk) => {
  const waiter = testWaiter()

  waiter.handleObservation(observation('jill', signal('x', [pending('Source', 'y')])))
  const cb0 = testCallbackRealTimeout(waiter, null)
  waiter.handleObservation(observation('autumn', signal('z', [])))
  notCalled(t, cb0)

  cb0._onHardTimeout()
  resolved(t, cb0)

  t.end()
}))

test('hard timeout causes rejection in strict mode', t => {
  const waiter = testWaiter({ strict: true })

  waiter.handleObservation(observation('jill', signal('x', [pending('Source', 'y')])))
  const cb0 = testCallbackRealTimeout(waiter, null)
  waiter.handleObservation(observation('autumn', signal('z', [])))
  notCalled(t, cb0)

  cb0._onHardTimeout()
  rejected(t, cb0)
  waiter.handleObservation(observation('jill', signal('y', [])))
  // NB: cb0.resolve() will have been called here. There is no guarantee that after a rejection,
  // resolve will not be called.
  t.end()
})

test.skip('can resolve only for certain nodes', t => {
  const waiter = testWaiter()

  waiter.handleObservation(observation('jill', signal('x', [pending('Validators', 'y')])))
  const cb1 = testCallback(waiter, ['autumn', 'jill'])
  t.equal(cb1.totalPending(), 2)
  waiter.handleObservation(observation('autumn', signal('y', [])))
  t.equal(cb1.totalPending(), 1)
  notCalled(t, cb1)

  const cb2 = testCallback(waiter, ['jill', 'mara'])
  t.equal(cb2.totalPending(), 2)

  waiter.handleObservation(observation('jill', signal('y', [])))
  t.equal(cb1.totalPending(), 0)
  t.equal(cb2.totalPending(), 1)
  resolved(t, cb1)
  notCalled(t, cb2)
  t.equal(waiter.totalEventsAwaiting(), 1)
  // t.deepEqual(waiter.pendingEffects[0], {
  //   event: 'y',
  //   dna: 'testnet',
  //   sourceNode: 'jill',
  //   targetNode: 'mara',
  // })

  waiter.handleObservation(observation('mara', signal('y', [])))
  t.equal(cb1.totalPending(), 0)
  t.equal(cb2.totalPending(), 0)
  resolved(t, cb2)

  t.end()
})

test('tracks events for Source', t => {
  const waiter = testWaiter()

  t.equal(waiter.totalEventsAwaiting(), 0)

  waiter.handleObservation(
    observation('autumn', signal('x', [pending('Source', 'y')]))
  )
  t.equal(waiter.totalEventsAwaiting(), 1)

  waiter.handleObservation(
    observation('mara', signal('y', []))
  )
  t.equal(waiter.totalEventsAwaiting(), 1)

  waiter.handleObservation(
    observation('autumn', signal('y', []))
  )
  t.equal(waiter.totalEventsAwaiting(), 0)

  t.end()
})

test('tracks events for Validators', t => {
  const waiter = testWaiter()

  t.equal(waiter.totalEventsAwaiting(), 0)

  waiter.handleObservation(
    observation('autumn', signal('x', [pending('Validators', 'y')]))
  )
  t.equal(waiter.totalEventsAwaiting(), 3)

  waiter.handleObservation(
    observation('mara', signal('y', []))
  )
  t.equal(waiter.totalEventsAwaiting(), 2)

  waiter.handleObservation(
    observation('jill', signal('y', []))
  )
  t.equal(waiter.totalEventsAwaiting(), 1)

  waiter.handleObservation(
    observation('autumn', signal('y', []))
  )
  t.equal(waiter.totalEventsAwaiting(), 0)
  t.end()
})
