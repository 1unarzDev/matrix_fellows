// Measures the actual production world fragment shader at the storm-ocean hot
// spot. This is a relative lab benchmark, not a physical-device FPS claim.
import { chromium } from '@playwright/test'
import {
  worldFragment,
  landWorldFragment,
  stormWorldFragment,
  floodHeight,
} from '../app/lib/scene/shaders.ts'

const variant = process.env.PROFILE_VARIANT || 'production'
let fragment = worldFragment
const scene = process.env.PROFILE_SCENE || 'storm'
const ratio = Number(process.env.PROFILE_RATIO || 0.7)
const progress = Number(
  process.env.PROFILE_PROGRESS || (scene === 'oasis' ? 1 : scene === 'desert' ? 0 : 2),
)
const seconds = Number(process.env.PROFILE_TIME || 8)
const aspect = Number(process.env.PROFILE_ASPECT || 0.462)
const verifyLand =
  process.env.PROFILE_VERIFY_LAND === '1' || process.env.PROFILE_VERIFY_PHASE === '1'
if (verifyLand && !['land-specialized', 'storm-specialized'].includes(variant))
  throw new Error('Equivalence check requires a specialized variant')
const verificationProgress =
  variant === 'storm-specialized'
    ? [1.42, 1.55, 1.65, 1.92, 2, 2.1]
    : [0, 0.16, 0.32, 0.55, 0.82, 1, 1.0599]
if (variant === 'lazy-sky') {
  fragment = fragment
    .replace(
      'if(submerged<.999) col=sky(rd,sun);',
      'if(submerged<.999 && dive>=.999) col=sky(rd,sun);',
    )
    .replace('    if(oasis<.999) {', '    else col=sky(rd,sun);\n    if(oasis<.999) {')
}
if (variant === 'land-specialized') {
  if (progress >= 1.06) throw new Error('Land specialization requires progress < 1.06')
  fragment = landWorldFragment
}
if (variant === 'storm-specialized') {
  if (progress < 1.42 || progress > 2.1)
    throw new Error('Storm specialization requires 1.42 <= progress <= 2.1')
  fragment = stormWorldFragment
}
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
    ({
      fragment,
      referenceFragment,
      rise,
      scene,
      ratio,
      progress,
      seconds,
      aspect,
      verifyLand,
      verificationProgress,
    }) => {
      const canvas = document.createElement('canvas')
      // Matches the initial 0.7 atmosphere scale of a 390 × 844 CSS viewport.
      canvas.width = Math.round(390 * ratio)
      canvas.height = Math.round(844 * ratio)
      const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: false })
      if (!gl) throw new Error('WebGL2 unavailable')
      const compile = (fragment) => {
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
        return program
      }
      const program = compile(fragment)
      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      )
      const configure = (program, progress, seconds, aspect, flash = 0) => {
        gl.useProgram(program)
        const position = gl.getAttribLocation(program, 'position')
        gl.enableVertexAttribArray(position)
        gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
        gl.uniform1f(gl.getUniformLocation(program, 'uAspect'), aspect)
        gl.uniform1f(gl.getUniformLocation(program, 'uProgress'), progress)
        gl.uniform1f(gl.getUniformLocation(program, 'uDetail'), 1)
        gl.uniform1f(gl.getUniformLocation(program, 'uTime'), seconds)
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
          scene === 'oasis'
            ? [12, 1, -66]
            : scene === 'desert'
              ? [0, 3, -40]
              : [2, -0.7 + rise, -94],
        )
        gl.uniform2f(gl.getUniformLocation(program, 'uClip'), 0.1, 150)
        gl.uniform2f(gl.getUniformLocation(program, 'uLightning'), flash, 2)
      }
      configure(program, progress, seconds, aspect)
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
      const pixels = new Uint8Array(canvas.width * canvas.height * 4)
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
      let fingerprint = 2166136261
      for (const byte of pixels) fingerprint = Math.imul(fingerprint ^ byte, 16777619) >>> 0
      const equivalence = []
      if (verifyLand) {
        const reference = compile(referenceFragment)
        const before = new Uint8Array(pixels.length)
        const after = new Uint8Array(pixels.length)
        for (const progress of verificationProgress)
          for (const seconds of [0, 8, 33])
            for (const aspect of [0.462, 0.75, 1.5]) {
              for (const flash of [0, 0.8]) {
                for (const [active, output] of [
                  [reference, before],
                  [program, after],
                ]) {
                  configure(active, progress, seconds, aspect, flash)
                  gl.drawArrays(gl.TRIANGLES, 0, 6)
                  gl.readPixels(
                    0,
                    0,
                    canvas.width,
                    canvas.height,
                    gl.RGBA,
                    gl.UNSIGNED_BYTE,
                    output,
                  )
                }
                let changedBytes = 0,
                  maxDelta = 0
                for (let i = 0; i < before.length; i++) {
                  const delta = Math.abs(before[i] - after[i])
                  if (delta) changedBytes++
                  maxDelta = Math.max(maxDelta, delta)
                }
                equivalence.push({
                  progress,
                  seconds,
                  aspect,
                  flash,
                  changedBytes,
                  changedFraction: changedBytes / before.length,
                  maxDelta,
                })
              }
            }
      }
      return {
        equivalence,
        fingerprint,
        renderer: gl.getParameter(gl.RENDERER),
        median: samples[4],
        p95: samples[7],
        samples,
      }
    },
    {
      fragment,
      referenceFragment: worldFragment,
      rise: floodHeight(progress),
      scene,
      ratio,
      progress,
      seconds,
      aspect,
      verifyLand,
      verificationProgress,
    },
  )
  console.log(
    JSON.stringify(
      { software, variant, scene, ratio, progress, seconds, aspect, ...result },
      null,
      2,
    ),
  )
  if (process.env.PROFILE_ASSERT && result.median > Number(process.env.PROFILE_ASSERT))
    process.exitCode = 1
  // One-LSB compiler rounding in <.01% of channels is not lost detail. Any
  // larger/color/edge difference fails; report even the accepted differences.
  if (result.equivalence.some((sample) => sample.maxDelta > 1 || sample.changedFraction >= 0.0001))
    process.exitCode = 1
} finally {
  await browser.close()
}
