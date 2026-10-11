// Deterministic shader differential. It compiles the retained baseline and
// current workspace quasar fragment passes in one browser context, renders
// both at identical times/resolutions, and reports RGBA8 pixel deltas.
//
//   node --import tsx scripts/benchmark-quasar-diff.mjs
// Exit non-zero only when a strict pixel budget is requested via
// QUASAR_DIFF_MAX_CHANGED_RATIO (useful in CI while iterating culling guards).
import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const baselinePath = process.env.QUASAR_BASELINE || '/tmp/workspace-quasar-baseline.ts'
const candidatePath = process.env.QUASAR_CANDIDATE || 'app/lib/scene/workspace-quasar.ts'
const [baselineSource, candidateSource] = await Promise.all([
  readFile(baselinePath, 'utf8'),
  readFile(candidatePath, 'utf8'),
])
const extract = (source, name) => {
  const marker = name + ':\\s*/\\* glsl \\*/\\s*' + '`([\\s\\S]*?)`'
  const match = source.match(new RegExp(marker))
  if (!match) throw new Error(`Could not extract ${name} from shader source`)
  return match[1]
}
const vertex = 'attribute vec3 position;\n' + extract(candidateSource, 'vertexShader')
const baseline = extract(baselineSource, 'fragmentShader')
const candidate = extract(candidateSource, 'fragmentShader')
const width = Number(process.env.QUASAR_DIFF_WIDTH || 1036)
const height = Number(process.env.QUASAR_DIFF_HEIGHT || 648)
const times = (process.env.QUASAR_DIFF_TIMES || '0,8,24').split(',').map(Number)
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage()
  const result = await page.evaluate(
    ({ vertex, baseline, candidate, width, height, times }) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true })
      if (!gl) throw new Error('WebGL unavailable')
      const compile = (type, source) => {
        const shader = gl.createShader(type)
        if (!shader) throw new Error('shader allocation failed')
        gl.shaderSource(shader, source)
        gl.compileShader(shader)
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
          throw new Error(gl.getShaderInfoLog(shader) || 'shader compile failed')
        return shader
      }
      const position = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, position)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
      const render = (fragment, time) => {
        const program = gl.createProgram()
        if (!program) throw new Error('program allocation failed')
        gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex))
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment))
        gl.linkProgram(program)
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
          throw new Error(gl.getProgramInfoLog(program) || 'program link failed')
        gl.useProgram(program)
        const positionLocation = gl.getAttribLocation(program, 'position')
        gl.enableVertexAttribArray(positionLocation)
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
        gl.uniform2f(gl.getUniformLocation(program, 'uResolution'), width, height)
        gl.uniform1f(gl.getUniformLocation(program, 'uTime'), time)
        gl.viewport(0, 0, width, height)
        gl.clearColor(0, 0, 0, 0)
        gl.clear(gl.COLOR_BUFFER_BIT)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        gl.finish()
        const pixels = new Uint8Array(width * height * 4)
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        gl.deleteProgram(program)
        return pixels
      }
      return times.map((time) => {
        const a = render(baseline, time)
        const b = render(candidate, time)
        let max = 0
        let sum = 0
        let changed = 0
        let changedOver2 = 0
        let minX = width
        let minY = height
        let maxX = -1
        let maxY = -1
        let peakX = 0
        let peakY = 0
        for (let i = 0; i < a.length; i++) {
          const delta = Math.abs(a[i] - b[i])
          max = Math.max(max, delta)
          if (delta === max) {
            peakX = Math.floor(i / 4) % width
            peakY = Math.floor(i / 4 / width)
          }
          sum += delta
          if (delta > 0) changed++
          if (delta > 2) {
            changedOver2++
            const x = Math.floor(i / 4) % width
            const y = Math.floor(i / 4 / width)
            minX = Math.min(minX, x)
            maxX = Math.max(maxX, x)
            minY = Math.min(minY, y)
            maxY = Math.max(maxY, y)
          }
        }
        return {
          time,
          max,
          mean: sum / a.length,
          changedRatio: changed / a.length,
          changedOver2Ratio: changedOver2 / a.length,
          changedOver2Bounds: changedOver2 ? { minX, minY, maxX, maxY } : null,
          peak: { x: peakX, y: peakY },
        }
      })
    },
    { vertex, baseline, candidate, width, height, times },
  )
  console.log(JSON.stringify({ baselinePath, candidatePath, width, height, times, result }, null, 2))
  const budget = Number(process.env.QUASAR_DIFF_MAX_CHANGED_RATIO || 0)
  if (budget && result.some((sample) => sample.changedOver2Ratio > budget)) process.exitCode = 1
} finally {
  await browser.close()
}
