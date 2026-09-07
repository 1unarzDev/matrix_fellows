// Actual shader water coverage: a height-field ocean cannot expose sky beneath
// an already visible crest in the same vertical screen column.
import { worldFragment, floodHeight } from '../app/lib/scene/shaders.ts'
import { chromium } from '@playwright/test'
let fragment = worldFragment
  .replace('float detail=1.0-', 'gl_FragColor=vec4(1,0,1,1); return; float detail=1.0-')
  .replace('gl_FragColor=vec4(col,1.0);', 'gl_FragColor=vec4(0,0,0,1);')
// Negative control preserves the exact former bug for validating the check.
if (process.argv.includes('--replay-old')) fragment = fragment
  .replace('step<512', 'step<80')
  .replace('return vec3(h,slope)*strength*farLod;', 'return vec3(h,slope)*strength;')
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage()
  const results = await page.evaluate(({ fragment, rise }) => {
    const canvas = document.createElement('canvas')
    canvas.width = 320; canvas.height = 240
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true })
    if (!gl) throw new Error('WebGL unavailable')
    const program = gl.createProgram()
    for (const [type, source] of [[gl.VERTEX_SHADER,
      'attribute vec2 position; varying vec2 vUv; void main(){vUv=position*.5+.5;gl_Position=vec4(position,0,1);}'],
      [gl.FRAGMENT_SHADER, fragment]]) {
      const shader = gl.createShader(type)
      gl.shaderSource(shader, source); gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader))
      gl.attachShader(program, shader)
    }
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program))
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    gl.uniform3f(gl.getUniformLocation(program, 'uCamera'), 2, 1.4 + rise, -52)
    gl.uniform3f(gl.getUniformLocation(program, 'uTarget'), 2, -.7 + rise, -94)
    gl.uniform1f(gl.getUniformLocation(program, 'uProgress'), 2)
    const results = []
    for (const aspect of [.462, 1.5, 2.4]) for (const time of [0, 3, 8, 17]) {
      gl.uniform1f(gl.getUniformLocation(program, 'uAspect'), aspect)
      gl.uniform1f(gl.getUniformLocation(program, 'uTime'), time)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      const pixels = new Uint8Array(320 * 240 * 4)
      gl.readPixels(0, 0, 320, 240, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      let gaps = 0, water = 0
      for (let x = 0; x < 320; x++) {
        let seenWater = false
        for (let y = 239; y >= 0; y--) {
          const wet = pixels[(y * 320 + x) * 4] > 200
          if (wet) { seenWater = true; water++ }
          else if (seenWater) gaps++
        }
      }
      results.push({ aspect, time, gaps, water })
    }
    return results
  }, { fragment, rise: floodHeight(2) })
  console.log(JSON.stringify(results))
  if (results.some(r => r.gaps || r.water < 100)) process.exitCode = 1
} finally { await browser.close() }
