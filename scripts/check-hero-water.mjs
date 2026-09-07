// Render the actual world shader with a water-only diagnostic output.
import { worldFragment, floodHeight } from '../app/lib/scene/shaders.ts'
import { chromium } from '@playwright/test'
const fragment = worldFragment
  .replace('float detail=1.0-', 'gl_FragColor=vec4(1,0,1,1); return;\n      float detail=1.0-')
  .replace('gl_FragColor=vec4(col,1.0);', 'gl_FragColor=vec4(0,0,0,1);')
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage()
  const results = await page.evaluate(
    ({ fragment, floodAtSea }) => {
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 192
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
      gl.uniform3f(gl.getUniformLocation(program, 'uCamera'), 0, 6.5, 30)
      gl.uniform3f(gl.getUniformLocation(program, 'uTarget'), 0, 3, -40)
      gl.uniform1f(gl.getUniformLocation(program, 'uProgress'), 0)
      const results = []
      for (const aspect of [0.462, 1, 1.5, 2.4])
        for (const time of [0, 1, 3, 8, 17, 31]) {
          gl.uniform1f(gl.getUniformLocation(program, 'uAspect'), aspect)
          gl.uniform1f(gl.getUniformLocation(program, 'uTime'), time)
          gl.drawArrays(gl.TRIANGLES, 0, 6)
          const pixels = new Uint8Array(256 * 192 * 4)
          gl.readPixels(0, 0, 256, 192, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
          let water = 0
          for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 200) water++
          results.push({ aspect, time, water })
        }
      // Positive controls: the same water must remain visible after the crest and at sea.
      for (const [progress, camera, target] of [
        [0.6, [4, 11, -4], [12, 1, -68]],
        [2, [2, 1.4 + floodAtSea, -52], [2, -0.7 + floodAtSea, -94]],
      ]) {
        gl.uniform1f(gl.getUniformLocation(program, 'uProgress'), progress)
        gl.uniform3fv(gl.getUniformLocation(program, 'uCamera'), camera)
        gl.uniform3fv(gl.getUniformLocation(program, 'uTarget'), target)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
        const pixels = new Uint8Array(256 * 192 * 4)
        gl.readPixels(0, 0, 256, 192, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        let water = 0
        for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 200) water++
        if (water < 100) throw new Error(`Water disappeared at progression ${progress}: ${water}`)
      }
      return results
    },
    { fragment, floodAtSea: floodHeight(2) },
  )
  const failures = results.filter((r) => r.water > 0)
  console.log(JSON.stringify({ samples: results.length, failures }))
  if (failures.length) process.exitCode = 1
} finally {
  await browser.close()
}
