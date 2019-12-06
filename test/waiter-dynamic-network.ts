import * as _ from 'lodash'

import { DnaId, FullSyncNetwork, Waiter } from '../src/index'
import { test, signal, pending } from './common'

const observation = (dna, node, signal) => ({ dna, node, signal })

test('can add and remove nodes from networks', t => {
  const waiter = new Waiter(FullSyncNetwork)
  waiter.addNode('n1', 'amanda')
  waiter.addNode('n2', 'amanda')
  waiter.addNode('n2', 'erin')

  t.deepEqual(_.mapValues(waiter.networks, n => [...n.nodes]), {
    n1: ['amanda'],
    n2: ['amanda', 'erin'],
  })

  waiter.removeNode('n1', 'amanda')
  t.deepEqual(_.mapValues(waiter.networks, n => [...n.nodes]), {
    n1: [],
    n2: ['amanda', 'erin'],
  })

  waiter.removeNode('n2', 'erin')
  t.deepEqual(_.mapValues(waiter.networks, n => [...n.nodes]), {
    n1: [],
    n2: ['amanda'],
  })
  t.end()
})


test('removing node from network also removes its pending effects', t => {
  const waiter = new Waiter(FullSyncNetwork)
  waiter.addNode('network', 'amanda')
  waiter.addNode('network', 'erin')
  waiter.addNode('network', 'aitin')

  waiter.handleObservation(observation('network', 'aitin', signal('x', [pending('Validators', 'y')])))
  t.equal(waiter.totalEventsAwaiting(), 3)

  waiter.removeNode('network', 'aitin')
  t.equal(waiter.totalEventsAwaiting(), 2)

  waiter.removeNode('network', 'erin')
  t.equal(waiter.totalEventsAwaiting(), 1)

  waiter.handleObservation(observation('network', 'erin', signal('y', [])))
  t.equal(waiter.totalEventsAwaiting(), 1)

  t.end()
})


test('adding a node to the network increases pending effects', t => {
  const waiter = new Waiter(FullSyncNetwork)
  waiter.addNode('network', 'amanda')
  waiter.addNode('network', 'erin')

  waiter.handleObservation(observation('network', 'amanda', signal('x', [pending('Validators', 'y')])))
  t.equal(waiter.totalEventsAwaiting(), 2)

  waiter.addNode('network', 'rose')
  waiter.addNode('network', 'ann')
  t.equal(waiter.totalEventsAwaiting(), 4)

  t.end()
})

test('adding a node to the network increases pending effects even when an event has been covered by others', t => {
  const waiter = new Waiter(FullSyncNetwork)
  waiter.addNode('network', 'amanda')
  waiter.addNode('network', 'galen')

  waiter.handleObservation(observation('network', 'amanda', signal('x', [pending('Validators', 'y')])))
  t.equal(waiter.totalEventsAwaiting(), 2)

  waiter.handleObservation(observation('network', 'amanda', signal('y', [])))
  waiter.handleObservation(observation('network', 'galen', signal('y', [])))
  t.equal(waiter.totalEventsAwaiting(), 0)

  waiter.addNode('network', 'rose')
  t.equal(waiter.totalEventsAwaiting(), 1)

  t.end()
})
