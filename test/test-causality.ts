import * as tape from 'tape'

import {Waiter} from '../src/waiter'
import {FullSyncNetwork} from '../src/network'

const agents = ['autumn', 'mara', 'jill']
const testCommit = {
  action_type: 'commit',
}
const testHold = {
  action_type: 'hold',
}

tape('x', t => {
  const network = new FullSyncNetwork(agents)
  const waiter = new Waiter(network)

  waiter.handleObservation({
    agent: 'autumn',
    action: testCommit
  })

  waiter.handleObservation({
    agent: 'mara',
    action: testHold,
  })
  waiter.handleObservation({
    agent: 'jill',
    action: testHold,
  })
  t.equal(waiter.pendingEffects.length, 1)

})
