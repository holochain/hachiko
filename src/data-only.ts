
// const matchAndExtract = (action: Action, matcher: CauseMatcher) => {

//   const go = (action: Action, matcher: CauseMatcher) => {
//     Object.entries(matcher).map(([key, matchVal]) => {
//       const sub = action[key]
//       if (sub === undefined) {
//         // The shape of the action does not match the matcher
//         console.debug("The shape of the action does not match the matcher")
//         return undefined
//       }
//       if (typeof sub !== typeof matchVal) {
//         // The shape of the action does not match the matcher
//         console.debug("The shape of the action does not match the matcher")
//         return undefined
//       }
//       if (typeof matchVal === 'object') {
//         return go(sub, matchVal)
//       } else if (typeof matchVal === 'string') {
//         if (matchVal.indexOf('%') === 0) {
//           const refName = matchVal.substr(1)
//           // return var name
//         } else {
//           // check if actual value matches matcher value
//         }
//       } else {
//         throw "invalid matcher"
//       }
//     })
//   }

//   const stuff = go(action, matcher, [])

//   return stuff
// }
