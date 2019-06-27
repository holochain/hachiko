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


const SOFT_TIMEOUT_MS = 16000
const HARD_TIMEOUT_MS = 60000

type InstrumentedObservation = {
  observation: Observation,
  stats: {
    timestamp: number
  }
}

type AwaitCallback = {
  nodes: Array<NodeId> | null,
  resolve: () => void,
  reject?: (any) => void,
  called?: boolean,
}

type AwaitCallbackWithTimeout = AwaitCallback & {
  softTimeout: any,
  hardTimeout: any,
  id: number,
}

export type NetworkMap = {[name: string]: NetworkModel}

export class Waiter {
  pendingEffects: Array<EffectConcrete>
  networks: NetworkMap
  complete: Promise<null>
  startTime: number
  callbacks: Array<AwaitCallbackWithTimeout>
  lastCallbackId: number

  completedObservations: Array<InstrumentedObservation>

  constructor(networks: NetworkMap) {
    this.assertUniqueness(networks)
    this.pendingEffects = []
    this.completedObservations = []
    this.callbacks = []
    this.networks = networks
    this.startTime = Date.now()
    this.lastCallbackId = 1
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

  registerCallback (cb: AwaitCallback) {
    logger.silly('rrrrrrrrrrREGISTERING callback with %n pending', this.pendingEffects.length)
    if (this.pendingEffects.length > 0) {
      // make it wait
      const tickingCallback = Object.assign({}, cb, {
        softTimeout: setTimeout(this.onSoftTimeout(cb), SOFT_TIMEOUT_MS),
        hardTimeout: setTimeout(this.onHardTimeout(cb), HARD_TIMEOUT_MS),
        id: this.lastCallbackId++
      })
      this.callbacks.push(tickingCallback)
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

  checkCompletion () {
    const grouped = _.groupBy(this.pendingEffects, e => e.targetNode)
    this.callbacks = this.callbacks.filter(({
      nodes, resolve, softTimeout, hardTimeout, id
    }) => {
      const completed = nodes
        ? nodes.every(nodeId => !(nodeId in grouped) || grouped[nodeId].length === 0)
        : this.pendingEffects.length === 0
      if (completed) {
        resolve()
        clearTimeout(softTimeout)
        clearTimeout(hardTimeout)
        logger.silly('resollllllved callback id: %s', id)
      }
      return !completed
    })
  }

  timeoutDump = () => {
    console.log("Still waiting on the following", colors.red('' + this.pendingEffects.length), "signal(s):")
    console.log(this.pendingEffects)
  }

  onSoftTimeout = (cb: AwaitCallback) => () => {
    console.log(colors.yellow("vvvv    hachiko warning    vvvv"))

    console.log(
      colors.yellow("a hachiko callback has been waiting for"),
      colors.yellow.underline(`${SOFT_TIMEOUT_MS / 1000} seconds`),
      colors.yellow("with no change"),
    )
    this.timeoutDump()
    console.log(colors.yellow("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"))
  }


  onHardTimeout = (cb: AwaitCallback) => () => {
    console.log(colors.red("vvvv  hachiko timed out!  vvvv"))
    this.timeoutDump()
    console.log(colors.red("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"))
    if (cb.reject) {
      cb.reject("hachiko timeout")
    } else {
      throw new Error("hachiko timeout!!")
    }
  }
}
