import * as _ from 'lodash'
import * as colors from 'colors'

import {
  EffectConcrete,
  EffectGroup,
  Observation,
  NodeId,
} from './elements'

import {
  NetworkModel
} from './network'

import logger from './logger'
import {CallbackData, TimedCallback} from './callback'


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

export type NetworkMap = {[name: string]: NetworkModel}

export class Waiter {
  pendingEffects: Array<EffectConcrete>
  networks: NetworkMap
  complete: Promise<null>
  startTime: number
  callbacks: Array<TimedCallback>
  lastCallbackId: number
  timeoutSettings: TimeoutSettings

  completedObservations: Array<InstrumentedObservation>

  constructor(networks: NetworkMap, opts?: WaiterOptions) {
    opts = opts || {}
    this.assertUniqueness(networks)
    this.pendingEffects = []
    this.completedObservations = []
    this.callbacks = []
    this.networks = networks
    this.startTime = Date.now()
    this.lastCallbackId = 1
    this.timeoutSettings = {
      softDuration: opts.softTimeout || DEFAULT_SOFT_TIMEOUT_MS,
      hardDuration: opts.hardTimeout || DEFAULT_HARD_TIMEOUT_MS,
      strict: opts.strict || false
    }
  }

  assertUniqueness (networks: NetworkMap) {
    const nodeIds = _.chain(networks).values().map(n => n.nodes).flatten().value()
    const frequencies = _.countBy(nodeIds)
    const dupes = Object.entries(frequencies).filter(([k, v]) => v > 1).map(([k, v]) => k)
    if (dupes.length > 0) {
      logger.debug('found dupes: %j', nodeIds)
      const msg = `There are ${dupes.length} non-unique node IDs specified in the Waiter creation: ${JSON.stringify(dupes)}`
      throw new Error(msg)
    }
  }

  registerCallback (cb: CallbackData) {
    logger.silly('rrrrrrrrrrREGISTERING callback with %n pending', this.pendingEffects.length)
    const timedCallback = new TimedCallback(this, cb)
    if (this.pendingEffects.length > 0) {
      // make it wait
      timedCallback.initTimers()
      this.callbacks.push(timedCallback)
    } else {
      // nothing to wait for
      cb.resolve()
    }
    return timedCallback
  }

  handleObservation (o: Observation) {
    const pendingBefore = this.totalPendingByCallbackId()
    this.consumeObservation(o)
    this.expandObservation(o)
    logger.debug(colors.yellow('last signal:'))
    logger.debug('%j', o)
    logger.debug(colors.yellow(`pending effects: (${this.pendingEffects.length} total)`))
    logger.debug('%j', this.pendingEffects)
    logger.debug(colors.yellow('callbacks: ${this.callbacks.length} total'))
    this.checkCompletion(pendingBefore)
  }

  consumeObservation (o: Observation) {
    const wasNotEmpty = this.pendingEffects.length > 0
    this.pendingEffects = this.pendingEffects.filter(({event, targetNode}) => {
      logger.silly('current event: %j', o.signal.event)
      logger.silly('pending event: %j', event)
      logger.silly('current node: %s', o.node)
      logger.silly('pending node: %s', targetNode)
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

  totalPendingByCallbackId () {
    return _.fromPairs(
      this.callbacks.map(tc => [
        tc.id,
        tc.totalPending()
      ])
    )
  }

  expandObservation (o: Observation) {
    if (!(o.dna in this.networks)) {
      throw new Error(`Attempting to process observation from unrecognized network '${o.dna}'`)
    }
    const effects = this.networks[o.dna].determineEffects(o)
    this.pendingEffects = this.pendingEffects.concat(effects)
  }

  checkCompletion (pendingBefore) {
    const grouped = _.groupBy(this.pendingEffects, e => e.targetNode)
    this.callbacks = this.callbacks.filter(tc => {
      const {id, cb: {resolve}} = tc
      const pending = tc.totalPending()
      const completed = pending === 0
      const decreased = pending < pendingBefore[tc.id]
      if (completed) {
        tc.clearTimers()
        resolve()
        logger.silly('resolved callback id: %s', id)
      } else if (decreased) {
        tc.setTimers()
      }
      return !completed
    })
  }
}
