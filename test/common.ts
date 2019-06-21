import * as tape from 'tape'
import * as sinon from 'sinon'

export const test = (desc, f) => {
  tape(desc, t => {
    // smush sinon.assert and tape API into a single object
    const s = sinon.assert
    s.pass = t.pass
    s.fail = t.fail
    f(Object.assign({}, t, s))
  })
}


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
