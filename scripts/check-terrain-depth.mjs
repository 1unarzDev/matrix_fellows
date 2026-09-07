import { readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'
import { PerspectiveCamera, Vector3 } from 'three'
import { worldFragment } from '../app/lib/scene/shaders.ts'
const world = await readFile('app/lib/scene/world.ts', 'utf8')
const quadSettings = world.split('const quadMaterial = ')[1].split('background.add')[0]
const camera = new PerspectiveCamera(50, 1.5, 0.1, 150)
camera.position.set(0, 6.5, 30)
camera.lookAt(0, 3, -40)
camera.updateMatrixWorld()
const fixtures = [
  { name: 'behind dune', point: [7, 0, -60], visible: false },
  { name: 'above dune', point: [7, 18, -60], visible: true },
]
const points = fixtures.map((item) => ({
  ...item,
  clip: new Vector3(...item.point).project(camera).toArray(),
}))
const browser = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage()
  const results = await page.evaluate(
    ({ fragment, depthWrite, clearDepth, points }) => {
      const canvas = document.createElement('canvas')
      canvas.width = 240
      canvas.height = 160
      const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true })
      if (!gl) throw new Error('WebGL2 required')
      function program(vertex, fragment) {
        const program = gl.createProgram()
        for (const [type, source] of [
          [gl.VERTEX_SHADER, vertex],
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
        if (!gl.getProgramParameter(program, gl.LINK_STATUS))
          throw new Error(gl.getProgramInfoLog(program))
        return program
      }
      const background = program(
        '#version 300 es\nin vec2 position; out vec2 vUv;void main(){vUv=position*.5+.5;gl_Position=vec4(position,0,1);}',
        '#version 300 es\nprecision highp float;out vec4 shaderColor;\n' +
          fragment.replaceAll('varying ', 'in ').replaceAll('gl_FragColor', 'shaderColor'),
      )
      const model = program(
        '#version 300 es\nuniform vec3 clip;void main(){gl_Position=vec4(clip,1);gl_PointSize=9.;}',
        '#version 300 es\nprecision highp float;out vec4 color;void main(){color=vec4(1,0,1,1);}',
      )
      const buffer = gl.createBuffer()
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      )
      gl.enable(gl.DEPTH_TEST)
      gl.depthFunc(gl.LEQUAL)
      return points.map((point) => {
        gl.depthMask(true)
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        gl.useProgram(background)
        const position = gl.getAttribLocation(background, 'position')
        gl.enableVertexAttribArray(position)
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
        gl.uniform3f(gl.getUniformLocation(background, 'uCamera'), 0, 6.5, 30)
        gl.uniform3f(gl.getUniformLocation(background, 'uTarget'), 0, 3, -40)
        gl.uniform1f(gl.getUniformLocation(background, 'uAspect'), 1.5)
        gl.uniform2f(gl.getUniformLocation(background, 'uClip'), 0.1, 150)
        gl.depthMask(depthWrite)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
        gl.depthMask(true)
        if (clearDepth) gl.clear(gl.DEPTH_BUFFER_BIT)
        gl.useProgram(model)
        gl.uniform3fv(gl.getUniformLocation(model, 'clip'), point.clip)
        gl.drawArrays(gl.POINTS, 0, 1)
        const pixels = new Uint8Array(240 * 160 * 4)
        gl.readPixels(0, 0, 240, 160, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
        let visible = 0
        for (let i = 0; i < pixels.length; i += 4)
          if (pixels[i] > 200 && pixels[i + 2] > 200) visible++
        return { name: point.name, expectedVisible: point.visible, pixels: visible }
      })
    },
    {
      fragment: worldFragment.replace('gl_FragColor=vec4(col,1.0);', 'gl_FragColor=vec4(0,0,0,1);'),
      depthWrite: /depthWrite: true/.test(quadSettings),
      clearDepth: world.includes('scenePass.clearDepth = true'),
      points,
    },
  )
  console.log(JSON.stringify(results))
  if (results.some((result) => result.pixels > 0 !== result.expectedVisible)) process.exitCode = 1
} finally {
  await browser.close()
}
