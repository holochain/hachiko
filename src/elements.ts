
export type Entry = {}
export type Event = String
export type NodeId = string
export type DnaId = string

export type NodeConfig = {
  id: NodeId,
  dna: DnaId,
}

export type Signal = {
  event: Event,
  pending: Array<EffectAbstract>
}

/**
 * A Signal emitted from a Node
 */
export type Observation = {
  dna: DnaId,
  node: NodeId,
  signal: Signal,
}


/**
 * A representation of a matcher for the effect of a Cause,
 * abstracted away from any particular network
 */
export type EffectAbstract = {
  event: Event,
  group: EffectGroup
}

/**
 * A representation of a matcher for the effect of a Cause,
 * as viewed by a particular node
 */
export type EffectConcrete = {
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
