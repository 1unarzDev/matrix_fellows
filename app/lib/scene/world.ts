import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js'
import { createOasisDressing } from './oasis'
import { nextFrameTime } from './frame-clock'
import { constellationLayout, constellationStarCount } from './constellations'
import {
  worldFragment,
  screenVertex,
  particleVertex,
  particleFragment,
  floodHeight,
  stormStrength,
  cameraFloodRise,
  lightningState,
} from './shaders'

export interface World {
  setProgress(value: number): void
  dispose(): void
}

export function createWorld(canvas: HTMLCanvasElement, onFailure: () => void, onFirstFrame?: () => void): World {
  let firstFrame = true
  const mobile = window.matchMedia('(max-width: 767px)').matches
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: false,
    powerPreference: 'low-power',
  })
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  renderer.autoClear = false
  const gl = renderer.getContext()
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
  if (debugInfo)
    canvas.dataset.renderer = String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
  const background = new THREE.Scene()
  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(new THREE.Color(0.6, 0.42, 0.25), 35, 150)
  const screenCamera = new THREE.Camera()
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 150)
  const target = new THREE.Vector3()
  const uniforms = {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uAspect: { value: 1 },
    uCamera: { value: camera.position },
    uTarget: { value: target },
    uClip: { value: new THREE.Vector2(camera.near, camera.far) },
    uLightning: { value: new THREE.Vector2() },
  }
  const quadGeometry = new THREE.PlaneGeometry(2, 2)
  const quadMaterial = new THREE.ShaderMaterial({
    vertexShader: screenVertex,
    fragmentShader: worldFragment,
    uniforms,
    depthWrite: true,
    depthTest: true,
  })
  background.add(new THREE.Mesh(quadGeometry, quadMaterial))
  const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: Math.min(4, renderer.capabilities.maxSamples),
    depthBuffer: true,
  })
  const composer = new EffectComposer(renderer, renderTarget)
  const backgroundPass = new RenderPass(background, screenCamera)
  const scenePass = new RenderPass(scene, camera)
  scenePass.clear = false
  scenePass.clearDepth = false
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.48, 0, 1.05)
  // Very coarse mip levels create visibly offset/blocky lobes around the sun.
  // Keep bloom's fine halo; the analytic lens shader supplies its broad glow.
  bloom.compositeMaterial.uniforms.bloomFactors!.value = [1, 0.65, 0.25, 0.08, 0.02]
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: screenVertex,
    fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
      void main(){vec3 c=max(texture2D(tDiffuse,vUv).rgb,vec3(0));
      gl_FragColor=vec4(pow(vec3(1)-exp(-c*1.35),vec3(.92)),1);}`,
  })
  composer.addPass(backgroundPass)
  composer.addPass(scenePass)
  composer.addPass(bloom)
  composer.addPass(grade)
  // MSAA handles silhouette coverage; a final mobile-only edge resolve also
  // softens texture cutouts and high-contrast wave highlights at bounded DPR.
  const edgeResolve = mobile ? new ShaderPass(FXAAShader) : undefined
  if (edgeResolve) composer.addPass(edgeResolve)

  // Stable seeds allow every particle to survive the entire journey.
  let seed = 1709
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const count = mobile ? 4200 : 12000
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random() - 0.5) * 48
    positions[i * 3 + 1] = (random() - 0.5) * 30
    positions[i * 3 + 2] = (random() - 0.5) * 55 - 10
    seeds[i] = random()
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
  const anchors = new THREE.BufferAttribute(new Float32Array(count * 4), 4)
  geometry.setAttribute('aAnchor', anchors)
  const particleUniforms = {
    uAspect: uniforms.uAspect,
    uTime: uniforms.uTime,
    uProgress: uniforms.uProgress,
    uPixelRatio: { value: 1 },
  }
  const material = new THREE.ShaderMaterial({
    vertexShader: particleVertex,
    fragmentShader: particleFragment,
    uniforms: particleUniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const particles = new THREE.Points(geometry, material)
  particles.frustumCulled = false
  scene.add(particles)

  // Explicit, source-backed star paths replace the random nearest-neighbor graph.
  const lineGeometry = new THREE.BufferGeometry()
  lineGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(constellationLayout(1).lines, 3),
  )
  const lineMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    color: '#98c8e8',
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  scene.add(new THREE.LineSegments(lineGeometry, lineMaterial))
  lineGeometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(constellationLayout(1).colors, 3),
  )

  const oasisDressing = createOasisDressing(scene, camera)

  let ratio = Math.min(window.devicePixelRatio, mobile ? 1 : 1.5)
  let disposed = false,
    visible = true,
    frame = 0,
    last = 0,
    elapsed = 0,
    slow = 0
  let sampleStart = performance.now(),
    sampleFrames = 0,
    lastRender = sampleStart
  let progress = 0
  let surfaceWidth = 0, surfaceHeight = 0
  // Explicit crest, basin, waterline, and submerged control points keep the reveals spatial.
  const cameraKeys = [
    { at: 0, position: [0, 6.5, 30], target: [0, 3, -40] },
    { at: 0.28, position: [1, 10, 17], target: [4, 1, -46] },
    { at: 0.6, position: [4, 11, -4], target: [12, 1, -68] },
    { at: 1, position: [6, 4.4, -22], target: [12, 1, -66] },
    { at: 1.35, position: [5.6, 4.4, -28], target: [10.8, 1, -72] },
    { at: 1.55, position: [5, 4.4, -35], target: [9, 1, -79] },
    { at: 1.65, position: [4.7, 1.6, -39], target: [8, -0.7, -83] },
    { at: 2, position: [2, 1.4, -52], target: [2, -0.7, -94] },
    { at: 2.28, position: [0, 0.3, -62], target: [0, -2, -100] },
    { at: 2.52, position: [0, -1.7, -68], target: [0, -5, -105] },
    { at: 3, position: [0, -9, -82], target: [0, -5, -112] },
    { at: 4, position: [0, 0, 22], target: [0, 0, -20] },
    { at: 5, position: [0, 0, 24], target: [0, 0, -20] },
  ]
  const positionsPath = new THREE.CatmullRomCurve3(
    cameraKeys.map((key) => new THREE.Vector3(...(key.position as [number, number, number]))),
    false,
    'catmullrom',
    0.3,
  )
  const targetsPath = new THREE.CatmullRomCurve3(
    cameraKeys.map((key) => new THREE.Vector3(...(key.target as [number, number, number]))),
    false,
    'catmullrom',
    0.3,
  )

  function resize() {
    const width = window.innerWidth
    // Safari toolbar movement changes innerHeight during a swipe. Keep the
    // large viewport surface stable, including its expensive bloom targets.
    const height = mobile && width === surfaceWidth
      ? surfaceHeight
      : Math.round(canvas.getBoundingClientRect().height) || window.innerHeight
    surfaceWidth = width
    surfaceHeight = height
    renderer.setPixelRatio(ratio)
    renderer.setSize(width, height, false)
    composer.setPixelRatio(ratio)
    composer.setSize(width, height)
    edgeResolve?.uniforms.resolution!.value.set(1 / (width * ratio), 1 / (height * ratio))
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    uniforms.uAspect.value = width / height
    const layout = constellationLayout(width / height)
    for (let i = 0; i < constellationStarCount; i++)
      anchors.setXYZW(
        i,
        layout.anchors[i * 4]!,
        layout.anchors[i * 4 + 1]!,
        layout.anchors[i * 4 + 2]!,
        1,
      )
    anchors.needsUpdate = true
    const lineVertices = lineGeometry.getAttribute('position') as THREE.BufferAttribute
    lineVertices.array.set(layout.lines)
    lineVertices.needsUpdate = true
    lineGeometry.computeBoundingSphere()
    particleUniforms.uPixelRatio.value = ratio
    canvas.dataset.pixelRatio = ratio.toFixed(2)
  }
  function setProgress(value: number) {
    progress = THREE.MathUtils.clamp(value, 0, 5)
    uniforms.uProgress.value = progress
    canvas.dataset.progress = progress.toFixed(3)
    let index = cameraKeys.findIndex(
      (key, i) =>
        i < cameraKeys.length - 1 && progress >= key.at && progress <= cameraKeys[i + 1]!.at,
    )
    if (index < 0) index = cameraKeys.length - 2
    const fraction =
      (progress - cameraKeys[index]!.at) / (cameraKeys[index + 1]!.at - cameraKeys[index]!.at)
    let pathIndex = index + fraction
    // Round the time-map corners around the flood handoff. The spatial spline
    // was continuous, but unequal key durations abruptly multiplied its speed.
    // Integrated smoothstep blends the clock rate, with no stored scroll lag.
    for (const boundary of [5, 6]) {
      const key = cameraKeys[boundary]!
      const x = progress - key.at
      const width = .045
      if (Math.abs(x) >= width) continue
      const incoming = 1 / (key.at - cameraKeys[boundary - 1]!.at)
      const outgoing = 1 / (cameraKeys[boundary + 1]!.at - key.at)
      const u = (x + width) / (2 * width)
      const softHinge = 2 * width * (u * u * u - .5 * u * u * u * u)
      pathIndex += (outgoing - incoming) * (softHinge - Math.max(0, x))
    }
    const t = pathIndex / (cameraKeys.length - 1)
    camera.position.copy(positionsPath.getPoint(t))
    target.copy(targetsPath.getPoint(t))
    // Ride the flood at the surface, then keep the same relative-depth dive.
    const rise = cameraFloodRise(progress, camera.position.y)
    camera.position.y += rise
    target.y += rise
    const weather = stormStrength(progress)
    const curtain =
      THREE.MathUtils.smoothstep(progress, 1.4, 1.59) *
      (1 - THREE.MathUtils.smoothstep(progress, 1.94, 2.12))
    const fog = scene.fog as THREE.Fog
    fog.near = THREE.MathUtils.lerp(35, 12, curtain)
    fog.far = THREE.MathUtils.lerp(150, 62, curtain)
    scene.fog!.color.setRGB(0.6, 0.42, 0.25).lerp(new THREE.Color(0.095, 0.12, 0.125), weather)
    canvas.dataset.cameraHeight = camera.position.y.toFixed(2)
    canvas.dataset.waterHeight = (-1 + floodHeight(progress)).toFixed(2)
    canvas.dataset.storm = weather.toFixed(2)
    camera.lookAt(target)
    lineMaterial.opacity = THREE.MathUtils.smoothstep(progress, 3.75, 4.15) * 0.25
    oasisDressing.setProgress(progress)
  }
  function draw(now: number) {
    if (disposed) return
    frame = requestAnimationFrame(draw)
    if (!visible || document.hidden) {
      last = now
      lastRender = now
      sampleStart = now
      sampleFrames = 0
      return
    }
    const delta = now - last
    // A 30 Hz callback can arrive a fraction early (notably low-power iOS).
    // Do not skip it and accidentally alternate 33/66 ms frames.
    const frameTime = nextFrameTime(now, last)
    if (frameTime === null) return
    elapsed += Math.min(now - lastRender, 70) / 1000
    lastRender = now
    last = frameTime
    uniforms.uTime.value = elapsed
    const lightning = lightningState(elapsed)
    uniforms.uLightning.value.set(lightning.intensity, lightning.seed)
    canvas.dataset.lightning = (lightning.intensity * stormStrength(progress)).toFixed(3)
    oasisDressing.setTime(elapsed)
    // Only a top-of-page arrival gets a low-to-high reveal. A restored/deep-link
    // chapter uses its normal camera immediately, never a trip through the desert.
    const emergence = (1-THREE.MathUtils.smoothstep(elapsed,0,1.8))
      *(1-THREE.MathUtils.smoothstep(progress,0,.08))
    const cameraY = camera.position.y, targetY = target.y
    camera.position.y -= emergence*1.8
    target.y -= emergence*3.2
    camera.lookAt(target)
    const start = performance.now()
    composer.render()
    camera.position.y = cameraY
    target.y = targetY
    if (firstFrame) {
      firstFrame = false
      onFirstFrame?.()
    }
    sampleFrames++
    if (now - sampleStart > 2000) {
      canvas.dataset.fps = ((sampleFrames * 1000) / (now - sampleStart)).toFixed(1)
      sampleStart = now
      sampleFrames = 0
    }
    const cost = performance.now() - start
    slow = cost > 27 || delta > 52 ? slow + 1 : Math.max(0, slow - 1)
    if (slow > 50 && ratio > 0.65) {
      ratio = Math.max(0.65, ratio * 0.8)
      geometry.setDrawRange(
        0,
        Math.floor(
          geometry.drawRange.count === Infinity ? count * 0.8 : geometry.drawRange.count * 0.85,
        ),
      )
      resize()
      slow = 0
    }
  }
  const contextLost = (event: Event) => {
    event.preventDefault()
    onFailure()
  }
  const observer = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting)
  })
  observer.observe(canvas)
  canvas.addEventListener('webglcontextlost', contextLost)
  const onResize = () => {
    if (mobile && window.innerWidth === surfaceWidth) return
    resize()
  }
  window.addEventListener('resize', onResize, { passive: true })
  resize()
  setProgress(0)
  frame = requestAnimationFrame(draw)
  return {
    setProgress,
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('webglcontextlost', contextLost)
      oasisDressing.dispose()
      geometry.dispose()
      material.dispose()
      lineGeometry.dispose()
      lineMaterial.dispose()
      quadGeometry.dispose()
      quadMaterial.dispose()
      backgroundPass.dispose()
      scenePass.dispose()
      bloom.dispose()
      grade.dispose()
      edgeResolve?.dispose()
      composer.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
