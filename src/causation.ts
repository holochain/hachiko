
import {
  Action,
  ActionPredicate,
  CauseMatcher,
  EffectAbstract,
  EffectGroup,
  Observation,
} from './elements'

import * as Im from 'immutable'


const cause =
  (predicate: ActionPredicate): CauseMatcher => ({predicate})

const effect =
  (group: EffectGroup) =>
  (predicate: ActionPredicate): EffectAbstract => ({predicate, group})

type CausationDef = {
  description: String,
  cause: CauseMatcher,
  effects: Array<EffectAbstract>,
  // update?: (CausationState, Action) => CausationState
}

const causations: Array<CausationDef> = [
  {
    description: "Publish",
    cause: cause(action => action.action_type === 'Publish'),
    effects: [
      effect(EffectGroup.Validators)(
        action => action.action_type === 'Hold'
      )
    ]
  },
]

export const resolveCause = (action: Action): Array<EffectAbstract> => {
  return flatten(
    causations
    .filter(({cause}) => {
      const match = cause.predicate(action)
    })
    .map(({effects}) => effects)
  )

}

const flatten = arrays => [].concat.apply([], arrays)
