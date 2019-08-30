import * as _ from 'lodash'

import { DnaId, FullSyncNetwork, Waiter } from '../src/index'
import { test } from './common'


test('can add nodes to networks', t => {
  const waiter = new Waiter()
  waiter.addNode('n1', 'amanda')
  waiter.addNode('n2', 'amanda')
  waiter.addNode('n2', 'erin')

  t.deepEqual(_.mapValues(waiter.networks, n => [...n.nodes]), {
    n1: ['amanda'],
    n2: ['amanda', 'erin'],
  })
  t.end()
})