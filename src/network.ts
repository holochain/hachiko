import * as _ from 'lodash'
import {
  NodeId,
  Entry,
  Event,
  EffectAbstract,
  EffectGroup,
  Signal,
} from './elements'
import logger from './logger'

export type ObservedEvents = Record<Event, Set<NodeId>>

/**
 * Base class for network models, which tracks a set of Nodes in a space,
 * and based on the history of Events seen in the network, calculates the conditions
 * for which the network is "consistent", meaning that any node should be able to
 * fetch what it needs from the network
 */
export class NetworkModel {
  // the total set of agents participating in the network
  // it's OK to modify this
  nodes: Set<NodeId>

  // Events which already happened
  observedEvents: ObservedEvents

  // Implied events, in abstract form
  pendingEffects: Array<EffectAbstract & {node: NodeId}>

  // We can cache the result of eventDiff if no new signals have been consumed since the last call
  cachedDiff: ObservedEvents | null

  // // a connectivity matrix representing every possible p2p connection
  // // the number represents additional latency to simulate. Negative numbers mean infinite latency.
  // connectionMatrix: Array<Array<number>>

  constructor(nodes: Array<NodeId>) {
    this.nodes = new Set(nodes)
    this.observedEvents = {}
    this.pendingEffects = []
    this.cachedDiff = null
  }

  consumeSignal(node: NodeId, signal: Signal) {
    logger.silly("consumeSignal: %s, %j", node, signal)
    const {event, pending} = signal
    if (!this.observedEvents[event]) {
      this.observedEvents[event] = new Set()
    }
    this.observedEvents[event].add(node)
    this.pendingEffects = this.pendingEffects.concat(pending.map(p => _.assign({node}, p)))
    this.cachedDiff = null
  }

  isConsistent(): boolean {
    return _.isEmpty(this.eventDiff())
  }

  numEventsAwaiting(): number {
    const diff = this.eventDiff()
    return _.sum(_.values(diff).map(ns => ns.size))
  }

  addNode(node: NodeId) {
    this.cachedDiff = null
    this.nodes.add(node)
  }

  removeNode(node: NodeId) {
    this.cachedDiff = null
    this.nodes.delete(node)
  }

  /**
   * Produces a map that describes what needs to show up in observedEvents
   * before the network can be considered in a consistent state.
   * If the map is empty, we are consistent.
   */
  eventDiff(): ObservedEvents {
    if (this.cachedDiff === null) {
      const frequencyPairs = this.pendingEffects.map(effect => {
        const {event, group, node} = effect
        const observed = this.observedEvents[event] || new Set()
        const nodes = (group === EffectGroup.Validators)
          ? Array.from(this.validators(event))
          : (group === EffectGroup.Source)
          ? [node]
          : (() => { throw new Error(`Unrecognized group: ${group}`) })()
          NaiveShardedNetwork
        // set difference (nodes - observed)
        const unresolved = nodes.filter(v => !observed.has(v))
        return [event, new Set(unresolved)]
      })
      .filter(([x, unresolved]) => !_.isEmpty(unresolved))

      this.cachedDiff = _.fromPairs(frequencyPairs)
    }
    logger.debug('eventDiff: %o', this.cachedDiff)
    return _.cloneDeep(this.cachedDiff)
  }

  /**
   * Determine which nodes are validators for a particular Entry,
   * based on the action (which should have a reference to the entry)
   */
  validators = (event: Event): Set<NodeId> => {
    throw "abstract method not implemented"
  }

}

/**
 * Network model which assumes that all nodes are validators for every entry
 */
export class FullSyncNetwork extends NetworkModel {

  validators = (entry: Entry): Set<NodeId> => {
    // currently full-sync
    return _.cloneDeep(this.nodes)
  }
}

/**
 * Network model which can handle a sharded network.
 * It ignores the particulars about which node should be validating which entry,
 * and instead expects a certain number of distinct validators to observe
 * each pending event, hoping that that will be enough.
 * This is a very approximate model, and relies heavily on the ability of Holochain
 * to fetch entries for nodes even before the node has reached full saturation,
 * as long as the network topology is somewhat stable around the time of publishing.
 */
export class NaiveShardedNetwork extends NetworkModel {

  minValidators: number = 15

  observationTimes: Record<Event, Array<number>>

  constructor(minValidators: number, nodes: Array<NodeId>) {
    super(nodes)
    this.minValidators = minValidators
    this.observationTimes = {}
  }

  consumeSignal(node: string, signal: Signal) {
    if (!this.observationTimes[signal.event]) {
      this.observationTimes[signal.event] = []
    }
    this.observationTimes[signal.event].push(Date.now())
    return NetworkModel.prototype.consumeSignal.call(this, node, signal)
  }

  validators = (entry: Entry): Set<NodeId> => {
    // This is not really the validators we want, it's just here to properly drive the
    // underlying eventDiff, from which we can deduce the proper waiting conditions
    return _.cloneDeep(this.nodes)
  }

  numValidators = (): number => {
    return Math.min(this.nodes.size, this.minValidators)
  }

  isConsistent(): boolean {
    return this.numEventsAwaiting() === 0
  }

  numEventsAwaiting(): number {
    return _.sum(
      _.values(this.eventDiff())
      .map(ns => Math.max(0, this.numValidators() - (this.nodes.size - ns.size)))
    )
  }

}
