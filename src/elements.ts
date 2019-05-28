
export type Entry = {}
export type NodeId = string
export type Action = {
  action_type: string,
  data: any,
}
export type Event = String
export type Signal = {
  event: Event,
  pending: Array<EffectAbstract>
}

/**
 * A representation of a matcher for the effect of a Cause,
 * abstracted away from any particular network
 */
export type EffectAbstract = {
  // description: string,
  event: Event,
  group: EffectGroup
}

/**
 * A representation of a matcher for the effect of a Cause,
 * as viewed by a particular node
 */
export type EffectConcrete = {
  // description: string,
  event: Event,
  sourceNode: NodeId,
  targetNode: NodeId,
}

/**
 * Specifies which group of agents the Effect affects
 * - Source: The node who produced the corresponding Cause
 * - Validators: All validators associated with the Cause
 */
export enum EffectGroup {
  Source = 'Source',
  Validators = 'Validators',
}


/**
 * A concrete Effect, in the context of a NetworkModel
 */
export type Observation = {
  node: NodeId,
  signal: Signal,
}
