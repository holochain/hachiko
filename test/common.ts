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
export const testCallback = (nodes) => ({
  resolve: sinon.spy(),
  reject: sinon.spy(),
  nodes
})


export const resolved = (t, cb) => {
  t.calledOnce(cb.resolve)
  t.notCalled(cb.reject)
}
export const rejected = (t, cb) => {
  t.notCalled(cb.resolve)
  t.calledOnce(cb.reject)
}
export const notCalled = (t, cb) => {
  t.notCalled(cb.resolve)
  t.notCalled(cb.reject)
}
