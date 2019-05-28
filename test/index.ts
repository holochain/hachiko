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

  t.equal(waiter.pendingEffects.length, 0)
  // waiter.handleObservation({
  //   node: 'autumn',
  //   signal: testCommit
  // })

  // waiter.handleObservation({
  //   node: 'mara',
  //   signal: testHold,
  // })
  // waiter.handleObservation({
  //   node: 'jill',
  //   signal: testHold,
  // })
  t.equal(waiter.pendingEffects.length, 0)

  t.end()

})
