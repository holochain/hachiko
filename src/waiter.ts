
import {
  Action,
  ActionPredicate,
  CauseMatcher,
  EffectConcrete,
  EffectGroup,
  Observation,
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

export class Waiter {
  pendingEffects: Array<EffectConcrete>
  networkModel: NetworkModel
  complete: Promise<null>
  startTime: number
  _resolve: any
  _reject: any

  completedObservations: Array<InstrumentedObservation>

  constructor(networkModel: NetworkModel) {
    this.pendingEffects = []
    this.completedObservations = []
    this.networkModel = networkModel
    this.startTime = Date.now()
    this.complete = new Promise(function (this: Waiter, resolve, reject) {
      this._resolve = resolve
      this._reject = reject
    })
  }

  handleObservation (o: Observation) {
    // const {action} = o
    this.consumeObservation(o)
    this.expandObservation(o)
  }

  consumeObservation (o: Observation) {
    const wasNotEmpty = this.pendingEffects.length > 0
    console.log(this.pendingEffects)
    this.pendingEffects = this.pendingEffects.filter(({predicate, targetNode}) => {
      const matches = predicate(o.action) && o.node === targetNode
      if (matches) {
        // big ol' side effect in a filter, but it works
        this.completedObservations.push({
          observation: o,
          stats: {
            timestamp: Date.now()
          }
        })
      }
      return !matches
    })
    if (wasNotEmpty && this.pendingEffects.length === 0) {
      this._resolve(this.completedObservations)
    }
  }

  expandObservation (o: Observation) {
    const effects = this.networkModel.determineEffects(o)
    this.pendingEffects.concat(effects)
  }
}
