import * as sinon from 'sinon'

import {
  test,
  observation,
  signal,
  pending,
  testCallback,
  withClock,
  testWaiter as makeTestWaiter,
  TIMEOUTS
} from './common'
import {TimedCallback} from '../src/callback'

const agents = ['kristina', 'gina', 'alex']
const testWaiter = (opts?) => makeTestWaiter(agents, opts)

const {soft, hard} = TIMEOUTS

test('soft timeout fires after one observation', withClock(async (t, clk) => {
  const waiter = testWaiter()
  waiter.handleObservation(observation('kristina', signal('x', [pending('Source', 'y')])))
  const cb0 = testCallback(waiter, null)!
  t.equal(waiter.callbacks.length, 1)
  clk.tick(soft / 2)
  t.notCalled(cb0.onSoftTimeout)
  clk.tick(soft / 2)
  t.calledOnce(cb0.onSoftTimeout)
  clk.tick(hard)
  t.calledOnce(cb0.onSoftTimeout)
  t.end()
}))

test('hard timeout fires after one observation', withClock(async (t, clk) => {
  const waiter = testWaiter()
  waiter.handleObservation(observation('kristina', signal('x', [pending('Source', 'y')])))
  const cb0 = testCallback(waiter, null)!
  t.equal(waiter.callbacks.length, 1)
  clk.tick(soft / 2)
  t.notCalled(cb0.onHardTimeout)
  clk.tick(hard / 2)
  t.notCalled(cb0.onHardTimeout)
  clk.tick(hard / 2)
  t.calledOnce(cb0.onHardTimeout)
  t.calledOnce(cb0.onSoftTimeout)
  t.end()
}))

test('timeouts reset with new relevant observations', withClock(async (t, clk) => {
  const waiter = testWaiter()
  waiter.handleObservation(observation('kristina', signal('x', [pending('Validators', 'y')])))
  const cb0 = testCallback(waiter, null)!

  clk.tick(soft)
  // first soft timeout triggered
  t.callCount(cb0.onSoftTimeout, 1)

  // a new observation comes in, resetting all timers
  waiter.handleObservation(observation('gina', signal('y', [])))

  clk.tick(soft / 2)
  t.callCount(cb0.onSoftTimeout, 1)

  clk.tick(soft / 2)
  // if that second observation hadn't happened, this would be when the hard timeout would occur
  t.notCalled(cb0.onHardTimeout)
  // instead, another soft timeout occurs
  t.callCount(cb0.onSoftTimeout, 2)

  // finally, the hard timeout interval has elasped since the last observation
  clk.tick(hard)
  t.callCount(cb0.onHardTimeout, 1)
  t.end()
}))

test('timeouts do not reset due to irrelevant observations', withClock(async (t, clk) => {
  const waiter = testWaiter()
  waiter.handleObservation(observation('kristina', signal('x', [pending('Source', 'y')])))
  const cb0 = testCallback(waiter, null)!

  clk.tick(soft)
  // first soft timeout triggered
  t.calledOnce(cb0.onSoftTimeout)

  // a new observation comes in, resetting all timers
  waiter.handleObservation(observation('gina', signal('x', [pending('Source', 'y')])))

  clk.tick(hard)
  t.calledOnce(cb0.onHardTimeout)

  t.end()
}))



test('timeout reset scenario 1', withClock(async (t, clk) => {
  const waiter = testWaiter()
  waiter.handleObservation(observation('kristina', signal('x', [pending('Validators', 'y')])))
  const cb0 = testCallback(waiter, ['kristina', 'gina'])
  const cb1 = testCallback(waiter, ['gina', 'alex'])
  t.callCount(cb0.onSoftTimeout, 0)
  t.callCount(cb0.onHardTimeout, 0)
  t.callCount(cb1.onSoftTimeout, 0)
  t.callCount(cb1.onHardTimeout, 0)

  clk.tick(soft)
  // first soft timeout triggered
  t.callCount(cb0.onSoftTimeout, 1)
  t.callCount(cb0.onHardTimeout, 0)
  t.callCount(cb1.onSoftTimeout, 1)
  t.callCount(cb1.onHardTimeout, 0)

  // cb0 does not reset, but cb1 does
  waiter.handleObservation(observation('gina', signal('w', [pending('Validators', 'z')])))
  waiter.handleObservation(observation('alex', signal('z', [])))

  clk.tick(hard - soft)
  t.callCount(cb0.onSoftTimeout, 1)
  t.callCount(cb0.onHardTimeout, 1)
  t.callCount(cb1.onSoftTimeout, 2)
  t.callCount(cb1.onHardTimeout, 0)


  clk.tick(soft)
  t.callCount(cb0.onSoftTimeout, 1)
  t.callCount(cb0.onHardTimeout, 1)
  t.callCount(cb1.onSoftTimeout, 2)
  t.callCount(cb1.onHardTimeout, 1)

  t.end()
}))
