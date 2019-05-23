
import {
  NodeId,
  Action,
  Entry,
  EffectAbstract,
  EffectConcrete,
  EffectGroup,
  Observation
} from './elements'

import {
  CausalityModel
} from './causation'

export class NetworkModel {
  // // the total set of agents participating in the network
  agents: Array<NodeId>
  causality: CausalityModel

  // // a connectivity matrix representing every possible p2p connection
  // // the number represents additional latency to simulate. Negative numbers mean infinite latency.
  // connectionMatrix: Array<Array<number>>

  constructor (agents: Array<NodeId>) {
    this.agents = agents
  }

  /**
   * Given a Cause, determine the Effects.
   * Ideally this will use a very general definition of Action causation,
   * decoupled from any concrete network. This function reifies those causation rules
   * in the context of this actual network, i.e. determines exactly which agents are involved in a
   * particular cause-effect pair.
   */
  determineEffects = (o: Observation): Array<EffectConcrete> => {
    const effects = this.causality.resolveAction(o.action)
    return effects.flatMap(e => this.reifyEffect(o, e))
  }

  reifyEffect = (
    {node, action}: Observation,
    {description, predicate, group}: EffectAbstract
  ): Array<EffectConcrete> => {
    if (group === EffectGroup.Self) {
      return [{description, predicate, sourceNode: node, targetNode: node}]
    } else if (group === EffectGroup.Validators) {
      return this.validators(action).map(targetNode => (
        { description, predicate, sourceNode: node, targetNode }
      ))
    } else {
      throw `unknown EffectGroup: ${group}`
    }
  }

  /**
   * Determine which agents are validators for a particular Entry,
   * based on the action (which should have a reference to the entry)
   */
  validators = (action: Action): Array<NodeId> => {
    throw "abstract method not implemented"
  }


  /**
   * Not sure what this will be. This is the part that returns promises for each awaited observation
   * from each agent, along with stats about the time took, timeouts, etc.
   */
  resolveObservations = async (observations: Array<Observation>) => {

  }
}

export class FullSyncNetwork extends NetworkModel {

  validators = (entry: Entry): Array<NodeId> => {
    // currently full-sync
    return this.agents
  }
}
