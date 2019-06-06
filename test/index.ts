import * as tape from 'tape'
import * as sinon from 'sinon'

import {Waiter} from '../src/waiter'
import {FullSyncNetwork} from '../src/network'

const observation = (node, signal) => ({node, signal})
const signal = (event, pending) => ({event, pending})
const pending = (group, event) => ({group, event})
const testCallback = (nodes) => ({resolve: sinon.spy(), reject: sinon.spy(), nodes})
const testWaiter = () => {
  const network = new FullSyncNetwork(agents)
  const waiter = new Waiter(network)
  return waiter
}

const test = (desc, f) => {
  tape(desc, t => {
    // smush sinon.assert and tape API into a single object
    const s = sinon.assert
    s.pass = t.pass
    s.fail = t.fail
    f(Object.assign({}, t, s))
  })
}

const numPending = (t, waiter, n) => t.equal(waiter.pendingEffects.length, n)
const resolved = (t, cb) => {
  t.calledOnce(cb.resolve)
  t.notCalled(cb.reject)
}
const rejected = (t, cb) => {
  t.notCalled(cb.resolve)
  t.calledOnce(cb.reject)
}
const notCalled = (t, cb) => {
  t.notCalled(cb.resolve)
  t.notCalled(cb.reject)
}

const agents = ['autumn', 'mara', 'jill']

test('resolves immediately if nothing pending', t => {
  const waiter = testWaiter()
  const cb0 = testCallback(null)
  const cb1 = testCallback(['autumn'])

  waiter.registerCallback(cb0)
  waiter.registerCallback(cb1)
  resolved(t, cb0)
  resolved(t, cb1)
  t.end()
})

test('resolves later if pending', t => {
  const waiter = testWaiter()
  const cb0 = testCallback(null)

  waiter.handleObservation(observation('jill', signal('x', [pending('Source', 'y')])))
  waiter.registerCallback(cb0)
  waiter.handleObservation(observation('autumn', signal('z', [])))
  notCalled(t, cb0)

  waiter.handleObservation(observation('jill', signal('y', [])))
  resolved(t, cb0)
  t.end()
})

test('soft timeout has no effect', t => {
  const waiter = testWaiter()
  const cb0 = testCallback(null)

  waiter.handleObservation(observation('jill', signal('x', [pending('Source', 'y')])))
  waiter.registerCallback(cb0)
  waiter.handleObservation(observation('autumn', signal('z', [])))
  notCalled(t, cb0)

  waiter.onSoftTimeout(cb0)()
  waiter.handleObservation(observation('jill', signal('y', [])))
  resolved(t, cb0)
  t.end()
})

test('hard timeout causes rejection', t => {
  const waiter = testWaiter()
  const cb0 = testCallback(null)

  waiter.handleObservation(observation('jill', signal('x', [pending('Source', 'y')])))
  waiter.registerCallback(cb0)
  waiter.handleObservation(observation('autumn', signal('z', [])))
  notCalled(t, cb0)

  waiter.onHardTimeout(cb0)()
  rejected(t, cb0)
  waiter.handleObservation(observation('jill', signal('y', [])))
  // NB: cb0.resolve() will have been called here. There is no guarantee that after a rejection,
  // resolve will not be called.
  t.end()
})

test('can resolve only for certain nodes', t => {
  const waiter = testWaiter()
  const cb2a = testCallback(['autumn', 'jill'])
  const cb2b = testCallback(['jill', 'mara'])

  waiter.handleObservation(observation('jill', signal('x', [pending('Validators', 'y')])))
  waiter.registerCallback(cb2a)
  waiter.handleObservation(observation('autumn', signal('y', [])))
  notCalled(t, cb2a)

  waiter.registerCallback(cb2b)
  waiter.handleObservation(observation('jill', signal('y', [])))
  resolved(t, cb2a)
  notCalled(t, cb2b)
  t.equal(waiter.pendingEffects.length, 1)
  t.deepEqual(waiter.pendingEffects[0], {
    event: 'y',
    sourceNode: 'jill',
    targetNode: 'mara',
  })

  waiter.handleObservation(observation('mara', signal('y', [])))
  t.calledOnce(cb2b.resolve)

  t.end()
})

test('tracks events for Source', t => {
  const waiter = testWaiter()

  t.equal(waiter.pendingEffects.length, 0)

  waiter.handleObservation(
    observation('autumn', signal('x', [pending('Source', 'y')]))
  )
  t.equal(waiter.pendingEffects.length, 1)

  waiter.handleObservation(
    observation('mara', signal('y', []))
  )
  t.equal(waiter.pendingEffects.length, 1)

  waiter.handleObservation(
    observation('autumn', signal('y', []))
  )
  t.equal(waiter.pendingEffects.length, 0)

  t.end()
})

test('tracks events for Validators', t => {
  const waiter = testWaiter()

  t.equal(waiter.pendingEffects.length, 0)

  waiter.handleObservation(
    observation('autumn', signal('x', [pending('Validators', 'y')]))
  )
  t.equal(waiter.pendingEffects.length, 3)

  waiter.handleObservation(
    observation('mara', signal('y', []))
  )
  t.equal(waiter.pendingEffects.length, 2)

  waiter.handleObservation(
    observation('jill', signal('y', []))
  )
  t.equal(waiter.pendingEffects.length, 1)

  waiter.handleObservation(
    observation('autumn', signal('y', []))
  )
  t.equal(waiter.pendingEffects.length, 0)
  t.end()
})
