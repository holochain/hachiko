import * as _ from 'lodash'

import {
  Observation,
  NodeId,
} from './elements'

import {
  NetworkModel, ObservedEvents
} from './network'

import logger from './logger'
import { CallbackData, TimedCallback } from './callback'


const DEFAULT_SOFT_TIMEOUT_MS = 5000
const DEFAULT_HARD_TIMEOUT_MS = 12000

type InstrumentedObservation = {
  observation: Observation,
  stats: {
    timestamp: number
  }
}

type TimeoutSettings = {
  softDuration: number,
  hardDuration: number,
  strict: boolean
}

export type WaiterOptions = {
  softTimeout?: number,
  hardTimeout?: number,
  strict?: boolean
}

export type NetworkMap = {
  [name: string]: NetworkModel,
}

export class Waiter {
  networks: NetworkMap
  makeNetwork: (nodes: Array<NodeId>) => NetworkModel
  complete: Promise<null>
  callbacks: Array<TimedCallback>
  timeoutSettings: TimeoutSettings

  completedObservations: Array<InstrumentedObservation>

  constructor(makeNetwork: (nodes: Array<NodeId>) => NetworkModel, initialNetworks: NetworkMap = {}, opts: WaiterOptions = {}) {
    this.completedObservations = []
    this.callbacks = []
    this.makeNetwork = makeNetwork
    this.networks = _.cloneDeep(initialNetworks)
    this.timeoutSettings = {
      softDuration: opts.softTimeout || DEFAULT_SOFT_TIMEOUT_MS,
      hardDuration: opts.hardTimeout || DEFAULT_HARD_TIMEOUT_MS,
      strict: opts.strict || false
    }
  }

  addNode(networkName: string, nodeId: NodeId) {
    if (this.networks[networkName]) {
      this.networks[networkName].addNode(nodeId)
    } else {
      this.networks[networkName] = this.makeNetwork([nodeId])
    }
  }

  removeNode(networkName: string, nodeId: NodeId) {
    if (this.networks[networkName]) {
      this.networks[networkName].removeNode(nodeId)
    }
    // don't worry about removing networks once all nodes leave
  }

  totalEventsAwaiting(): number {
    return _.sum(_.values(this.networks).map(model => model.numEventsAwaiting()))
  }

  eventsAwaiting(): Record<NodeId, ObservedEvents> {
    return _.mapValues(this.networks, model => model.eventDiff())
  }

  registerCallback(cb: CallbackData) {
    logger.silly('REGISTERING callback with %i pending', this.totalEventsAwaiting())
    const timedCallback = new TimedCallback(this, cb)
    if (this.totalEventsAwaiting() > 0) {
      // make it wait
      timedCallback.initTimers()
      this.callbacks.push(timedCallback)
    } else {
      // nothing to wait for
      cb.resolve(0)
    }
    return timedCallback
  }

  handleObservation(o: Observation) {
    const pendingBefore = this._totalPendingByCallbackId()
    logger.silly("Handling observation: %j", o)
    this.networks[o.dna].consumeSignal(o.node, o.signal)
    this.completedObservations.push({
      observation: o,
      stats: { timestamp: Date.now() }
    })

    this._checkCompletion(pendingBefore)
  }

  _totalPendingByCallbackId() {
    return _.fromPairs(
      this.callbacks.map(tc => [
        tc.id,
        tc.totalPending()
      ])
    )
  }

  _checkCompletion(pendingBefore) {
    this.callbacks = this.callbacks.filter(tc => {
      const { id, cb: { resolve } } = tc
      const pending = tc.totalPending()
      const completed = tc.isCompleted()
      const decreased = pending < pendingBefore[tc.id]
      if (completed) {
        tc.clearTimers()
        resolve(this.completedObservations.length - tc.numCompletedAtStart)
        logger.silly('resolved callback id: %s', id)
      } else if (decreased) {
        tc.setTimers()
      }
      return !completed
    })
  }
}
