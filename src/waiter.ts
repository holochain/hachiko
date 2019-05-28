import {groupBy} from 'lodash'

import {
  Action,
  EffectConcrete,
  EffectGroup,
  Observation,
  NodeId,
} from './elements'

import {
  NetworkModel
} from './network'

type InstrumentedObservation = {
  observation: Observation,
  stats: {
    timestamp: number
  }
}

type AwaitCallback = {
  nodes: Array<NodeId> | null,
  callback: any,
}

export class Waiter {
  pendingEffects: Array<EffectConcrete>
  networkModel: NetworkModel
  complete: Promise<null>
  startTime: number
  callbacks: Array<AwaitCallback>

  completedObservations: Array<InstrumentedObservation>

  constructor(networkModel: NetworkModel) {
    this.pendingEffects = []
    this.completedObservations = []
    this.callbacks = []
    this.networkModel = networkModel
    this.startTime = Date.now()
  }

  registerCallback (cb: AwaitCallback) {
    console.log('rrrrrrrrrrREGISTERING callback with', this.pendingEffects.length, 'pending')
    if (this.pendingEffects.length > 0) {
      // make it wait
      this.callbacks.push(cb)
    } else {
      // nothing to wait for
      cb.callback()
    }
  }

  handleObservation (o: Observation) {
    this.consumeObservation(o)
    this.expandObservation(o)
    console.log('wwwwwwwwwwwwwwwwwwwWAITING ON THIS MANY: ', this.pendingEffects.length)
    console.log(o)
    console.log(this.pendingEffects)
    this.checkCompletion()
  }

  consumeObservation (o: Observation) {
    const wasNotEmpty = this.pendingEffects.length > 0
    this.pendingEffects = this.pendingEffects.filter(({event, targetNode}) => {
      const matches = o.signal.event === event && o.node === targetNode
      if (matches) {
        // side effect in a filter, but it works
        this.completedObservations.push({
          observation: o,
          stats: {
            timestamp: Date.now()
          }
        })
      }
      return !matches
    })
  }

  expandObservation (o: Observation) {
    const effects = this.networkModel.determineEffects(o)
    this.pendingEffects = this.pendingEffects.concat(effects)
  }

  checkCompletion () {
    const grouped = groupBy(this.pendingEffects, e => e.targetNode)
    this.callbacks = this.callbacks.filter(({nodes, callback}) => {
      const completed = nodes
        ? nodes.every(nodeId => grouped[nodeId].length === 0)
        : this.pendingEffects.length === 0
      if (completed) {
        callback()
      }
      return !completed
    })
  }
}
