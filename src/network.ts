
import {
  Agent,
  Action,
  Entry,
  EffectAbstract,
  EffectConcrete,
  EffectGroup,
  Observation
} from './elements'

import {
  resolveCause
} from './causation'

export class NetworkModel {
  // // the total set of agents participating in the network
  agents: Array<Agent>

  // // a connectivity matrix representing every possible p2p connection
  // // the number represents additional latency to simulate. Negative numbers mean infinite latency.
  // connectionMatrix: Array<Array<number>>

  constructor (agents: Array<Agent>) {
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
    const effects = resolveCause(o.action)
    return effects.map(e => this.reifyEffect(o, e))
  }

  reifyEffect = ({agent, action}: Observation, {predicate, group}: EffectAbstract): EffectConcrete => {
    if (group === EffectGroup.Self) {
      return {predicate, agents: [agent]}
    } else if (group === EffectGroup.Validators) {
      return {predicate, agents: this.validators(action) }
    } else {
      throw `unknown EffectGroup: ${group}`
    }
  }

  /**
   * Determine which agents are validators for a particular Entry,
   * based on the action (which should have a reference to the entry)
   */
  validators = (action: Action): Array<Agent> => {
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

  validators = (entry: Entry): Array<Agent> => {
    // currently full-sync
    return this.agents
  }
}
