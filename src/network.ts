
import {
  NodeId,
  Action,
  Entry,
  Event,
  EffectAbstract,
  EffectConcrete,
  EffectGroup,
  Observation
} from './elements'


export class NetworkModel {
  // // the total set of agents participating in the network
  agents: Array<NodeId>

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
    const effects: Array<EffectConcrete> = []
    for (const ea of o.signal.pending) {
      for (const ec of this.reifyEffect(o, ea)) {
        effects.push(ec)
      }
    }
    return effects
  }

  reifyEffect = (
    {node, signal}: Observation,
    {event, group}: EffectAbstract
  ): Array<EffectConcrete> => {
    if (group === EffectGroup.Source) {
      return [{event, sourceNode: node, targetNode: node}]
    } else if (group === EffectGroup.Validators) {
      return this.validators(event).map(targetNode => (
        { event, sourceNode: node, targetNode }
      ))
    } else {
      throw `unknown EffectGroup: ${group}`
    }
  }

  /**
   * Determine which agents are validators for a particular Entry,
   * based on the action (which should have a reference to the entry)
   */
  validators = (event: Event): Array<NodeId> => {
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
