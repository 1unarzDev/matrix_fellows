// Measures the actual production world fragment shader at the storm-ocean hot
// spot. This is a relative lab benchmark, not a physical-device FPS claim.
import { chromium } from '@playwright/test'
import { worldFragment, floodHeight } from '../app/lib/scene/shaders.ts'

const variant = process.env.PROFILE_VARIANT || 'production'
let fragment = worldFragment
const scene = process.env.PROFILE_SCENE || 'storm'
const ratio = Number(process.env.PROFILE_RATIO || 0.7)
if (variant === 'no-swell-trace')
  fragment = fragment.replace(
    'if(swellStrength(p)>.04 && rd.y<.16)',
    'if(false && swellStrength(p)>.04 && rd.y<.16)',
  )
if (variant === 'four-wave-octaves') fragment = fragment.replace('i<7', 'i<4')
if (variant === 'two-fbm-octaves') fragment = fragment.replaceAll('i<4', 'i<2')
if (variant === 'no-foreground-water')
  fragment = fragment.replace(
    'if(!swellHit && waterDist>0.0 && waterDist<dist && waterDist<2000.0 && inBasin)',
    'if(false && !swellHit && waterDist>0.0 && waterDist<dist && waterDist<2000.0 && inBasin)',
  )
if (variant === 'cheap-storm-reflection')
  fragment = fragment.replace(
    'col=mix(transmission,sky(reflected,sun),fresnel);',
    'vec3 reflectedSky=vec3(.095,.12,.125);if(storm<.65)reflectedSky=sky(reflected,sun);col=mix(transmission,reflectedSky,fresnel);',
  )
if (variant === 'no-water-surface-detail')
  fragment = fragment.replace('surface=waves(wp.xz);', 'surface=swell(wp.xz);')
if (variant === 'no-water-reflection')
  fragment = fragment.replace(
    'col=mix(transmission,sky(reflected,sun),fresnel);',
    'col=transmission;',
  )

if (variant !== 'production' && fragment === worldFragment)
  throw new Error(`Shader variant ${variant} did not match current production source`)
const software = process.env.PROFILE_GPU === 'software'
const browser = await chromium.launch({
  args: software
    ? ['--no-sandbox', '--enable-unsafe-swiftshader']
    : [
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
    ({ fragment, rise, scene, ratio }) => {
      const canvas = document.createElement('canvas')
      // Matches the initial 0.7 atmosphere scale of a 390 × 844 CSS viewport.
      canvas.width = Math.round(390 * ratio)
      canvas.height = Math.round(844 * ratio)
      const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: false })
      if (!gl) throw new Error('WebGL2 unavailable')
      const program = gl.createProgram()
      for (const [type, source] of [
        [
          gl.VERTEX_SHADER,
          '#version 300 es\nin vec2 position;out vec2 vUv;void main(){vUv=position*.5+.5;gl_Position=vec4(position,0,1);}',
        ],
        [
          gl.FRAGMENT_SHADER,
          '#version 300 es\nprecision highp float;out vec4 shaderColor;\n' +
            fragment
              .replaceAll('varying vec2 vUv;', 'in vec2 vUv;')
              .replaceAll('gl_FragColor', 'shaderColor')
              .replaceAll('texture2D(', 'texture('),
        ],
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
      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      )
      const position = gl.getAttribLocation(program, 'position')
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
      gl.uniform1f(gl.getUniformLocation(program, 'uAspect'), 0.462)
      gl.uniform1f(
        gl.getUniformLocation(program, 'uProgress'),
        scene === 'oasis' ? 1 : scene === 'desert' ? 0 : 2,
      )
      gl.uniform1f(gl.getUniformLocation(program, 'uDetail'), 1)
      gl.uniform1f(gl.getUniformLocation(program, 'uTime'), 8)
      gl.uniform3fv(
        gl.getUniformLocation(program, 'uCamera'),
        scene === 'oasis'
          ? [6, 4.4, -22]
          : scene === 'desert'
            ? [0, 6.5, 30]
            : [2, 1.4 + rise, -52],
      )
      gl.uniform3fv(
        gl.getUniformLocation(program, 'uTarget'),
        scene === 'oasis' ? [12, 1, -66] : scene === 'desert' ? [0, 3, -40] : [2, -0.7 + rise, -94],
      )
      gl.uniform2f(gl.getUniformLocation(program, 'uClip'), 0.1, 150)
      gl.uniform2f(gl.getUniformLocation(program, 'uLightning'), 0, 0)
      const pixel = new Uint8Array(4)
      for (let i = 0; i < 2; i++) {
        gl.drawArrays(gl.TRIANGLES, 0, 6)
        gl.readPixels(
          Math.floor(canvas.width / 2),
          Math.floor(canvas.height / 2),
          1,
          1,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          pixel,
        )
      }
      const samples = []
      for (let i = 0; i < 8; i++) {
        const start = performance.now()
        for (let draw = 0; draw < 4; draw++) gl.drawArrays(gl.TRIANGLES, 0, 6)
        gl.readPixels(
          Math.floor(canvas.width / 2),
          Math.floor(canvas.height / 2),
          1,
          1,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          pixel,
        )
        samples.push((performance.now() - start) / 4)
      }
      samples.sort((a, b) => a - b)
      return {
        renderer: gl.getParameter(gl.RENDERER),
        median: samples[4],
        p95: samples[7],
        samples,
      }
    },
    { fragment, rise: floodHeight(2), scene, ratio },
  )
  console.log(JSON.stringify({ software, variant, scene, ratio, ...result }, null, 2))
  if (process.env.PROFILE_ASSERT && result.median > Number(process.env.PROFILE_ASSERT))
    process.exitCode = 1
} finally {
  await browser.close()
}
