import * as _ from 'lodash'

import { DnaId, FullSyncNetwork, Waiter } from '../src/index'
import { test } from './common'

const nodes = {
  n1: ['autumn', 'mara', 'jill'],
  n2: ['bo', 'skylar'],
  n3: ['lucas', 'blair']
}
const networksFromNodes = nodes => _.mapValues(nodes, ns => new FullSyncNetwork(ns))
const dnaForNode = (node): DnaId => Object.keys(nodes).find(k => nodes[k].includes(node))!
const observation = (node, signal) => ({ node, signal, dna: dnaForNode(node) })
const signal = (event, pending) => ({ event, pending })
const pending = (group, event) => ({ group, event })

const testWaiter = () => {
  const networks = networksFromNodes(nodes)
  const waiter = new Waiter(networks)
  return waiter
}


test('tracks events across multiple networks', t => {
  const waiter = testWaiter()

  t.equal(waiter.pendingEffects.length, 0)

  waiter.handleObservation(
    observation('autumn', signal('x', [pending('Validators', 'y')]))
  )
  t.equal(waiter.pendingEffects.length, 3)

  waiter.handleObservation(
    observation('lucas', signal('x', [pending('Validators', 'y')]))
  )
  t.equal(waiter.pendingEffects.length, 5)

  waiter.handleObservation(observation('jill', signal('y', [])))
  t.equal(waiter.pendingEffects.length, 4)

  // ensure duplicate observations and observations on other networks
  // don't affect the pending list
  waiter.handleObservation(observation('jill', signal('y', [])))
  waiter.handleObservation(observation('bo', signal('y', [])))
  waiter.handleObservation(observation('skylar', signal('y', [])))
  t.equal(waiter.pendingEffects.length, 4)

  waiter.handleObservation(observation('blair', signal('y', [])))
  t.equal(waiter.pendingEffects.length, 3)

  waiter.handleObservation(observation('lucas', signal('y', [])))
  t.equal(waiter.pendingEffects.length, 2)

  waiter.handleObservation(observation('autumn', signal('y', [])))
  waiter.handleObservation(observation('mara', signal('y', [])))
  t.equal(waiter.pendingEffects.length, 0)

  t.end()
})


test('waiter can function even if node ids overlap', t => {

  // NB: 'x' shows up as a nodeId in two networks
  const waiter = new Waiter(networksFromNodes({
    a: ['a', 'b', 'c'],
    b: ['x', 'y', 'z'],
    c: ['h', 'a', 'x'],
  }))

  waiter.handleObservation({
    dna: 'b',
    node: 'x',
    signal: signal('p', [pending('Validators', 'q')])
  })
  waiter.handleObservation({
    dna: 'c',
    node: 'x',
    signal: signal('p', [pending('Validators', 'q')])
  })
  t.equal(waiter.pendingEffects.length, 6)

  waiter.handleObservation({
    dna: 'b',
    node: 'x',
    signal: signal('q', [])
  })
  // This is the main test. If there was some confusion about duplicated
  // node IDs, we would expect this observations to reduce the pending list
  // down to 4 instead of 5.
  t.equal(waiter.pendingEffects.length, 5)

  waiter.handleObservation({
    dna: 'c',
    node: 'x',
    signal: signal('q', [])
  })
  t.equal(waiter.pendingEffects.length, 4)
  t.end()
})