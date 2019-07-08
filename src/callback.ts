
import * as colors from 'colors'

import {NodeId} from './elements'
import {Waiter} from './waiter'


export type CallbackData = {
  // nodes to require consistency for, or all nodes if `null`
  nodes: Array<NodeId> | null,
  resolve: () => void,
  reject?: (any) => void,
  called?: boolean,
}


export class TimedCallback {
  // the Waiter that issued this timed callback
  waiter: any

  // the original CallbackData registered via registerCallback
  cb: CallbackData

  softInterval: any
  hardInterval: any
  id: number

  constructor(waiter: Waiter, cb: CallbackData) {
    this.cb = cb
    this.waiter = waiter
    this.softInterval = null
    this.hardInterval = null
  }

  timeoutDump () {
    console.log("Processed", colors.red('' + this.waiter.completedObservations.length), "signal(s) so far, but")
    console.log("still waiting on the following", colors.red('' + this.waiter.pendingEffects.length), "signal(s):")
    console.log(this.waiter.pendingEffects)
  }

  onSoftTimeout () {
    console.log(colors.yellow("vvvv    hachiko warning    vvvv"))
    console.log(
      colors.yellow("a hachiko callback has been waiting for"),
      colors.yellow.underline(`${this.waiter.timeoutSettings.softDuration / 1000} seconds`),
      colors.yellow("with no change"),
    )
    this.timeoutDump()
    console.log(colors.yellow("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"))
  }

  onHardTimeout () {
    const observations = this.waiter.completedObservations.map(o => o.observation)
    console.log(colors.red("vvvv  hachiko timed out!  vvvv"))
    console.log(
      colors.red("a hachiko callback has been waiting for"),
      colors.red.underline(`${this.waiter.timeoutSettings.hardDuration / 1000} seconds`),
      colors.red("with no change"),
    )
    this.timeoutDump()
    console.log(colors.red("------------------------------"))
    console.log(colors.red(`Successfully handled ${this.waiter.completedObservations.length} observations:`))
    console.log(JSON.stringify(observations, null, 2))
    console.log(colors.red("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"))
    if (this.cb.reject) {
      this.cb.reject("hachiko timeout")
    } else {
      throw new Error("hachiko timeout!!")
    }
  }

  setTimers (): void {
    this.clearTimers()
    this.softInterval = setTimeout(this.onSoftTimeout.bind(this), this.waiter.timeoutSettings.softDuration)
    this.hardInterval = setTimeout(this.onHardTimeout.bind(this), this.waiter.timeoutSettings.hardDuration)
  }

  clearTimers (): void {
    clearTimeout(this.softInterval)
    clearTimeout(this.hardInterval)
  }
}