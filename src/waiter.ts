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


const DEFAULT_SOFT_TIMEOUT_MS = 8000
const DEFAULT_HARD_TIMEOUT_MS = 90000

type InstrumentedObservation = {
  observation: Observation,
  stats: {
    timestamp: number
  }
}

export type NetworkMap = {[name: string]: NetworkModel}

export class Waiter {
  pendingEffects: Array<EffectConcrete>
  networks: NetworkMap
  complete: Promise<null>
  startTime: number
  callbacks: Array<TimedCallback>
  lastCallbackId: number
  timeoutSettings: {softDuration: number, hardDuration: number}

  completedObservations: Array<InstrumentedObservation>

  constructor(networks: NetworkMap, opts?) {
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
    if (this.pendingEffects.length > 0) {
      // make it wait
      const timedCallback = new TimedCallback(this, cb)
      timedCallback.setTimers()
      this.callbacks.push(timedCallback)
      return timedCallback
    } else {
      // nothing to wait for
      cb.resolve()
    }
  }

  handleObservation (o: Observation) {
    this.consumeObservation(o)
    this.expandObservation(o)
    logger.debug(colors.yellow('last signal:'))
    logger.debug('%j', o)
    logger.debug(colors.yellow(`pending effects: (${this.pendingEffects.length} total)`))
    logger.debug('%j', this.pendingEffects)
    logger.debug(colors.yellow('callbacks: ${this.callbacks.length} total'))
    this.checkCompletion()
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

  expandObservation (o: Observation) {
    if (!(o.dna in this.networks)) {
      throw new Error(`Attempting to process observation from unrecognized network '${o.dna}'`)
    }
    const effects = this.networks[o.dna].determineEffects(o)
    this.pendingEffects = this.pendingEffects.concat(effects)
  }

  updateTimers (o: Observation) {
    this.callbacks
      .filter(tc => !tc.cb.nodes || tc.cb.nodes.includes(o.node))
      .forEach(tc => tc.setTimers())
  }

  checkCompletion () {
    const grouped = _.groupBy(this.pendingEffects, e => e.targetNode)
    this.callbacks = this.callbacks.filter(tc => {
      const {id, cb: {nodes, resolve}} = tc
      const completed = nodes
        ? nodes.every(nodeId => !(nodeId in grouped) || grouped[nodeId].length === 0)
        : this.pendingEffects.length === 0
      if (completed) {
        tc.clearTimers()
        resolve()
        logger.silly('resolved callback id: %s', id)
      }
      return !completed
    })
  }
}
