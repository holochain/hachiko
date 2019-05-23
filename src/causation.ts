
import {
  Action,
  ActionPredicate,
  CauseMatcher,
  EffectAbstract,
  EffectGroup,
  Observation,
} from './elements'

import * as Im from 'immutable'


export class CausalityModel {
  commitCache: {[address: string]: any}

  constructor() {
    this.commitCache = {}
  }

  resolveAction = (action: Action): Array<EffectAbstract> => {
    console.log('-----------------------')
    console.log('resolveAction:')
    console.log(JSON.stringify(action, null, 2))
    console.log('-----------------------')
    console.log('')

    const data = action.data
    switch (action.action_type) {
      case 'Commit':
        const entry = data[0]
        // this.commitCache[]
        break
      case 'Publish':
        break
      case 'AddPendingValidation':
        break
    }

    return []
  }

}

const effect = (
  description: string,
  group: EffectGroup,
  predicate: ActionPredicate
): EffectAbstract => ({description, predicate, group})
