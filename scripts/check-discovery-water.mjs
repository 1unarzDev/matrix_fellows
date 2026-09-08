import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { worldFragment, particleVertex } from '../app/lib/scene/shaders.ts'

await mkdir('test-results/discovery', { recursive: true })
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } })
  const result = await page.evaluate(({ fragment, particles }) => {
    const canvas = document.createElement('canvas')
    canvas.width = 900; canvas.height = 600
    document.body.style.margin = '0'; document.body.append(canvas)
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true })
    if (!gl) throw new Error('WebGL unavailable')
    const compile = (type, source) => {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source); gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader))
      return shader
    }
    compile(gl.VERTEX_SHADER, 'precision highp float; attribute vec3 position; uniform mat4 modelViewMatrix; uniform mat4 projectionMatrix;\n' + particles)
    const program = gl.createProgram()
    gl.attachShader(program, compile(gl.VERTEX_SHADER, 'attribute vec2 position; varying vec2 vUv; void main(){vUv=position*.5+.5;gl_Position=vec4(position,0,1);}'))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment.replace('gl_FragColor=vec4(col,1.0);', 'gl_FragColor=vec4(pow(vec3(1.0)-exp(-max(col,vec3(0))*1.35),vec3(.92)),1.0);')))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    const uniform = name => gl.getUniformLocation(program, name)
    gl.uniform1f(uniform('uTime'), 7)
    gl.uniform2f(uniform('uClip'), .1, 150)
    gl.uniform3f(uniform('uCamera'), 6, 4.4, -22)
    gl.uniform3f(uniform('uTarget'), 12, 1, -66)
    window.renderDiscovery = (progress, age, aspect = 1.5) => {
      const width = aspect < 1 ? 390 : 900, height = aspect < 1 ? 844 : 600;
      if(canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height }
      gl.viewport(0, 0, width, height)
      gl.uniform1f(uniform('uProgress'), progress)
      gl.uniform1f(uniform('uDiscoveryTime'), age)
      gl.uniform1f(uniform('uAspect'), aspect)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      const pixels = new Uint8Array(canvas.width * canvas.height * 4)
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      return pixels
    }
    const stats = []
    for (const p of [0, 1, 1.5, 3]) {
      const before = window.renderDiscovery(p, 0)
      const after = window.renderDiscovery(p, 7)
      let changed = 0
      for (let i = 0; i < before.length; i += 4) {
        if (Math.abs(before[i]-after[i])+Math.abs(before[i+1]-after[i+1])+Math.abs(before[i+2]-after[i+2]) > 9) changed++
      }
      stats.push({ progress: p, changed })
    }
    return stats
  }, { fragment: worldFragment, particles: particleVertex })
  assert(result.find(row => row.progress === 1).changed > 100, 'Ripple must visibly affect the oasis')
  assert(result.filter(row => row.progress !== 1).every(row => row.changed === 0), 'Ripple leaked into another chapter')
  for (const [name, age, aspect] of [['before', 0, 1.5], ['contact', 4.8, 1.5], ['expanding', 7, 1.5], ['dissolving', 12, 1.5], ['mobile', 7, .462]]) {
    await page.setViewportSize(aspect < 1 ? { width: 390, height: 844 } : { width: 900, height: 600 })
    await page.evaluate(([age, aspect]) => window.renderDiscovery(1, age, aspect), [age, aspect])
    await page.screenshot({ path: `test-results/discovery/${name}.png` })
  }
  console.log(JSON.stringify({ shaders: 'compiled', frames: result }))
} finally { await browser.close() }
