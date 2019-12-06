import * as _ from 'lodash'
import * as colors from 'colors'

import { NodeId } from './elements'
import { Waiter } from './waiter'


export type CallbackData = {
  // nodes to require consistency for, or all nodes if `null`
  nodes: Array<NodeId> | null,
  resolve: (_: number) => void,
  reject?: (_: any) => void,
  called?: boolean,
}


export class TimedCallback {

  static _lastId: number

  // the Waiter that issued this timed callback
  waiter: any

  // the original CallbackData registered via registerCallback
  cb: CallbackData

  softInterval: any
  hardInterval: any
  id: number
  numCompletedAtStart: number

  constructor(waiter: Waiter, cb: CallbackData) {
    this.cb = cb
    this.waiter = waiter
    this.softInterval = null
    this.hardInterval = null
    this.id = TimedCallback._lastId++
    this.numCompletedAtStart = waiter.completedObservations.length
  }

  totalPending() {
    const { cb: { nodes } } = this
    const grouped = _.groupBy(this.waiter.pendingEffects, e => e.targetNode)
    return nodes
      ? nodes.reduce((sum, nodeId) => sum + (nodeId in grouped ? grouped[nodeId].length : 0), 0)
      : this.waiter.pendingEffects.length
  }

  isCompleted(): boolean {
    return this.totalPending() === 0 || !this.hardInterval
  }

  setTimers(): void {
    if (this.softInterval || this.hardInterval) {
      this.clearTimers()
      this.initTimers()
    }
  }

  clearTimers(): void {
    clearTimeout(this.softInterval)
    clearTimeout(this.hardInterval)
    this.softInterval = null
    this.hardInterval = null
  }

  initTimers(): void {
    this.softInterval = setTimeout(() => this._onSoftTimeout(), this.waiter.timeoutSettings.softDuration)
    this.hardInterval = setTimeout(() => this._onHardTimeout(), this.waiter.timeoutSettings.hardDuration)
  }

  _timeoutDump() {
    console.log("Processed", colors.red('' + this.waiter.completedObservations.length), "signal(s) so far, but")
    console.log("still waiting on the following", colors.red('' + this.waiter.pendingEffects.length), "signal(s):")
    console.log(this.waiter.pendingEffects)
  }

  _onSoftTimeout() {
    console.log(colors.yellow("vvvv    hachiko warning    vvvv"))
    console.log(
      colors.yellow("a hachiko callback has been waiting for"),
      colors.yellow.underline(`${this.waiter.timeoutSettings.softDuration / 1000} seconds`),
      colors.yellow("with no change"),
    )
    this._timeoutDump()
    console.log(colors.yellow("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"))
  }

  _onHardTimeout() {
    this.clearTimers()
    const observations = this.waiter.completedObservations.map(o => o.observation)
    console.log(colors.red("vvvv  hachiko timed out!  vvvv"))
    console.log(
      colors.red("a hachiko callback has been waiting for"),
      colors.red.underline(`${this.waiter.timeoutSettings.hardDuration / 1000} seconds`),
      colors.red("with no change"),
    )
    this._timeoutDump()
    console.log(colors.red("------------------------------"))
    console.log(colors.red(`Successfully handled ${this.waiter.completedObservations.length} observations:`))
    console.log(observations)
    console.log(colors.red("^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"))
    if (this.waiter.timeoutSettings.strict) {
      if (this.cb.reject) {
        this.cb.reject("hachiko timeout")
      } else {
        throw new Error("hachiko timeout!!")
      }
    } else {
      console.log("Since hachiko is not in strict mode, the test will resume now,")
      console.log("even though hachiko thinks it will fail. Good luck!")
      this.cb.resolve(this.waiter.completedObservations.length - this.numCompletedAtStart)
    }
  }
}

TimedCallback._lastId = 1
