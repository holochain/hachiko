import * as _ from 'lodash'

import { DnaId, FullSyncNetwork, Waiter } from '../src/index'
import { test } from './common'


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
  t.end()
})


test('removing node from network also removes its pending effects', t => {
  t.fail("TODO")
})
