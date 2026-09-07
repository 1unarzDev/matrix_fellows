import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { cameraFloodRise, floodHeight } from '../app/lib/scene/shaders.ts'
const source = readFileSync(new URL('../app/lib/scene/world.ts', import.meta.url), 'utf8')
const keys = Function(`return ${source.match(/const cameraKeys = (\[[\s\S]*?\n  \])/)[1]}`)()
const mapping = source.slice(source.indexOf('    let index = cameraKeys.findIndex'), source.indexOf('    camera.position.copy(positionsPath.getPoint(t))'))
const parameter = new Function('cameraKeys', 'progress', `${mapping.replaceAll(']!', ']')} return t`)
const path = new THREE.CatmullRomCurve3(keys.map(k => new THREE.Vector3(...k.position)), false, 'catmullrom', .3)
const position = p => {
  const v = path.getPoint(parameter(keys, p))
  v.y += cameraFloodRise(p, process.argv.includes('--replay-old-lift') ? undefined : v.y)
  return v
}
const results = [1.55, 1.65].map(p => {
  const h = .0001
  const before = position(p).sub(position(p-h)).divideScalar(h)
  const after = position(p+h).sub(position(p)).divideScalar(h)
  return { progress: p, velocityJump: before.distanceTo(after) }
})
console.log(results)
for (const r of results) assert.ok(r.velocityJump < 2, `Camera speed jumps at ${r.progress}`)
for (let p=1.35; p<=2.1; p+=.001) assert.ok(position(p).y-(-1+floodHeight(p)) > .5, `Premature submersion at ${p}`)
const aimPath = new THREE.CatmullRomCurve3(keys.map(k => new THREE.Vector3(...k.target)), false, 'catmullrom', .3)
const yaw = p => {
  const aim = aimPath.getPoint(parameter(keys, p))
  const eye = path.getPoint(parameter(keys, p))
  return Math.atan2(aim.x-eye.x, eye.z-aim.z)
}
let maxYawRate = 0, maxSidewaysRate = 0
for (let p=1.35; p<1.99; p+=.001) {
  maxYawRate = Math.max(maxYawRate, Math.abs(yaw(p+.001)-yaw(p))/.001)
  maxSidewaysRate = Math.max(maxSidewaysRate, Math.abs(position(p+.001).x-position(p).x)/.001)
}
console.log({ maxYawRate, maxSidewaysRate })
assert.ok(maxYawRate < .65, 'Flood framing swivels too quickly')
assert.ok(maxSidewaysRate < 13, 'Flood camera slides sideways too quickly')
let maxForwardRate = 0
for (let p=1.35; p<1.99; p+=.001) {
  maxForwardRate = Math.max(maxForwardRate, Math.abs(position(p+.001).z-position(p).z)/.001)
}
console.log({ maxForwardRate })
assert.ok(maxForwardRate < 65, 'Flood camera surges forward too quickly')
// The descent may bottom out once, but must not rise and then dip again.
let rising = false
for (let p=1.55; p<1.75; p+=.001) {
  const delta = position(p+.001).y-position(p).y
  if (delta > .0001) rising = true
  if (rising) assert.ok(delta >= -.0001, `Vertical bump at ${p}`)
}
