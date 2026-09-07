import { readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { CatmullRomCurve3, Vector3 } from 'three'
import { worldFragment, cameraFloodRise } from '../app/lib/scene/shaders.ts'

const fragment = worldFragment
  // Optional negative control recreates the GPU-specific invalid lighting input.
  .replace(
    'float lightHeight=clamp(uv.y,0.0,1.0);',
    process.argv.includes('--replay-unclamped')
      ? 'float lightHeight=uv.y;'
      : 'float lightHeight=clamp(uv.y,0.0,1.0);',
  )
  .replace(
    'gl_FragColor=vec4(col,1.0);',
    'if(any(notEqual(col,col))) { gl_FragColor=vec4(1,0,1,1); } else { gl_FragColor=vec4(0,0,0,1); }',
  )
const world = await readFile('app/lib/scene/world.ts', 'utf8')
const keys = Function(
  `return ${world.split('const cameraKeys = ')[1].split('\n  const positionsPath')[0].trim()}`,
)()
const path = (field) =>
  new CatmullRomCurve3(
    keys.map((k) => new Vector3(...k[field])),
    false,
    'catmullrom',
    0.3,
  )
const positions = path('position'),
  targets = path('target')
const frames = []
for (let step = 0; step <= 200; step++) {
  const progress = 1.8 + step * 0.005
  const index = keys.findIndex(
    (key, i) => i < keys.length - 1 && progress >= key.at && progress <= keys[i + 1].at,
  )
  const t =
    (index + (progress - keys[index].at) / (keys[index + 1].at - keys[index].at)) /
    (keys.length - 1)
  const camera = positions.getPoint(t),
    target = targets.getPoint(t)
  camera.y += cameraFloodRise(progress)
  target.y += cameraFloodRise(progress)
  frames.push({
    progress,
    camera: camera.toArray(),
    target: target.toArray(),
  })
}
const browser = await chromium.launch({
  args: [
    '--no-sandbox',
    '--enable-gpu',
    '--use-gl=angle',
    '--use-angle=gl-egl',
    '--ignore-gpu-blocklist',
  ],
})
try {
  const page = await browser.newPage()
  const result = await page.evaluate(
    ({ fragment, frames }) => {
      const canvas = document.createElement('canvas')
      canvas.width = 160
      canvas.height = 120
      const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true })
      if (!gl) throw new Error('WebGL unavailable')
      const program = gl.createProgram()
      for (const [type, source] of [
        [
          gl.VERTEX_SHADER,
          'attribute vec2 position; varying vec2 vUv; void main(){vUv=position*.5+.5;gl_Position=vec4(position,0,1);}',
        ],
        [gl.FRAGMENT_SHADER, fragment],
      ]) {
        const shader = gl.createShader(type)
        gl.shaderSource(shader, source)
        gl.compileShader(shader)
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
          throw new Error(gl.getShaderInfoLog(shader))
        gl.attachShader(program, shader)
      }
      gl.linkProgram(program)
      gl.useProgram(program)
      const buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      )
      const position = gl.getAttribLocation(program, 'position')
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
      const sequences = []
      for (const aspect of [0.462, 1.5])
        for (const time of [0, 8]) {
          gl.uniform1f(gl.getUniformLocation(program, 'uAspect'), aspect)
          gl.uniform1f(gl.getUniformLocation(program, 'uTime'), time)
          const samples = []
          for (const frame of frames) {
            gl.uniform1f(gl.getUniformLocation(program, 'uProgress'), frame.progress)
            gl.uniform3fv(gl.getUniformLocation(program, 'uCamera'), frame.camera)
            gl.uniform3fv(gl.getUniformLocation(program, 'uTarget'), frame.target)
            gl.drawArrays(gl.TRIANGLES, 0, 6)
            const pixels = new Uint8Array(160 * 120 * 4)
            gl.readPixels(0, 0, 160, 120, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
            let invalid = 0
            for (let i = 0; i < pixels.length; i += 4) {
              if (pixels[i] > 200 && pixels[i + 2] > 200) invalid++
            }
            samples.push({
              progress: frame.progress,
              invalid,
            })
          }
          sequences.push({ aspect, time, samples })
        }
      return sequences
    },
    { fragment, frames },
  )
  const failures = []
  for (const seq of result)
    for (const sample of seq.samples) {
      if (sample.invalid > 0) failures.push({ aspect: seq.aspect, time: seq.time, ...sample })
    }
  console.log(JSON.stringify({ frames: frames.length * result.length, failures }, null, 2))
  if (failures.length) process.exitCode = 1
} finally {
  await browser.close()
}
