import * as _ from 'lodash'
import {
  NodeId,
  Entry,
  Event,
  EffectAbstract,
  EffectConcrete,
  EffectGroup,
  Observation,
  Signal,
} from './elements'
import logger from './logger'

export type ObservedEvents = Record<Event, Set<NodeId>>

export class NetworkModel {
  // the total set of agents participating in the network
  // it's OK to modify this
  nodes: Set<NodeId>

  // Events which already happened
  observedEvents: ObservedEvents

  // We can cache the result of eventDiff if no new signals have been consumed since the last call
  cachedDiff: ObservedEvents | null

  // Implied events, in abstract form
  pendingEffects: Array<EffectAbstract & {node: NodeId}>

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

export class FullSyncNetwork extends NetworkModel {

  validators = (entry: Entry): Set<NodeId> => {
    // currently full-sync
    return _.cloneDeep(this.nodes)
  }
}
