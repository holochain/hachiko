
export type Entry = {}
export type Agent = string
export type Action = {
  action_type: string,
  data: any,
}

export type ActionPredicate = (action: Action) => boolean

export type CauseMatcher = {
  predicate: ActionPredicate,
}

/**
 * A representation of a matcher for the effect of a Cause,
 * abstracted away from any particular network
 */
export type EffectAbstract = {
  predicate: ActionPredicate,
  group: EffectGroup
}

/**
 * A representation of a matcher for the effect of a Cause,
 * as viewed by a particular agent
 */
export type EffectConcrete = {
  predicate: ActionPredicate,
  agents: Array<Agent>
}

/**
 * Specifies which group of agents the Effect affects
 * - Self: The agent who produced the corresponding Cause
 * - Validators: All validators associated with the Cause
 */
export enum EffectGroup {
  Self,
  Validators
}


/**
 * A concrete Effect, in the context of a NetworkModel
 */
export type Observation = {
  agent: Agent,
  action: Action,
}
