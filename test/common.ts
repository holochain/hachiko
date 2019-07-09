import * as tape from 'tape'
import * as sinon from 'sinon'

const runTest = runner => (desc, f) => {
  runner(desc, t => {
    // smush sinon.assert and tape API into a single object
    const s = sinon.assert
    s.pass = t.pass
    s.fail = t.fail
    f(Object.assign({}, t, s))
  })
}

export const test: any = runTest(tape)
test.only = runTest(tape.only)

export const observation = (node, signal) => ({node, signal, dna: 'testnet'})
export const signal = (event, pending) => ({event, pending})
export const pending = (group, event) => ({group, event})
export const testCallbackRealTimeout = (waiter, nodes) => {
  const cb = waiter.registerCallback({
    resolve: sinon.spy(),
    reject: sinon.spy(),
    nodes
  })
  return cb
}
export const testCallback = (waiter, nodes) => {
  const cb = testCallbackRealTimeout(waiter, nodes)
  cb.onSoftTimeout = sinon.spy()
  cb.onHardTimeout = sinon.spy()
  return cb
}


export const resolved = (t, tc) => {
  t.calledOnce(tc.cb.resolve)
  t.notCalled(tc.cb.reject)
}
export const rejected = (t, tc) => {
  t.notCalled(tc.cb.resolve)
  t.calledOnce(tc.cb.reject)
}
export const notCalled = (t, tc) => {
  t.notCalled(tc.cb.resolve)
  t.notCalled(tc.cb.reject)
}
