import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { createOasisDressing } from './oasis'
import { nextFrameTime } from './frame-clock'
import { constellationLayout, constellationStarCount } from './constellations'
import { createFrameProfiler } from './frame-profiler'
import {
  degradeQuality,
  recoverQuality,
  initialQuality,
  initialRenderProfile,
} from './render-quality'
import {
  worldFragment,
  screenVertex,
  particleVertex,
  particleFragment,
  constellationLineVertex,
  constellationLineFragment,
  floodHeight,
  stormStrength,
  cameraFloodRise,
  lightningState,
  meteorChapterVisibility,
} from './shaders'

export interface World {
  setProgress(value: number): void
  dispose(): void
}

export function createWorld(
  canvas: HTMLCanvasElement,
  onFailure: () => void,
  onFirstFrame?: () => void,
): World {
  let firstFrame = true
  const coarsePointer = window.matchMedia('(pointer: coarse)').matches
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const renderProfile = initialRenderProfile({
    coarsePointer,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: memory,
  })
  const efficient = renderProfile === 'efficient'
  let quality = initialQuality(renderProfile, window.devicePixelRatio)
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: false,
    antialias: false,
    powerPreference: 'low-power',
  })
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace
  renderer.autoClear = false
  // The world uses several render calls per logical frame. Disable Three's
  // per-call reset so the exposed diagnostics describe the complete frame.
  renderer.info.autoReset = false
  const gl = renderer.getContext()
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
  const rendererName = debugInfo
    ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL))
    : String(gl.getParameter(gl.RENDERER))
  canvas.dataset.renderer = rendererName
  canvas.dataset.renderProfile = renderProfile
  const frameProfiler = createFrameProfiler(gl, rendererName)
  const background = new THREE.Scene()
  const scene = new THREE.Scene()
  scene.fog = new THREE.Fog(new THREE.Color(0.6, 0.42, 0.25), 35, 150)
  const screenCamera = new THREE.Camera()
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 150)
  const target = new THREE.Vector3()
  const stormFog = new THREE.Color(0.095, 0.12, 0.125)
  const uniforms = {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uAspect: { value: 1 },
    uCamera: { value: camera.position },
    uTarget: { value: target },
    uClip: { value: new THREE.Vector2(camera.near, camera.far) },
    uLightning: { value: new THREE.Vector2() },
    uMeteor: { value: new THREE.Vector4(-1, 0, 0, 0) },
    uMeteorVisibility: { value: 1 },
    uCosmicTime: { value: 0 },
    uDetail: { value: quality.detail ? 1 : 0 },
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
  // The procedural landscape dominates fragment cost. On phones render only
  // that layer at a lower resolution; retain a sharp full-resolution foreground
  // for palm leaves, rocks, particles and constellation lines.
  const atmosphereTarget = efficient
    ? new THREE.WebGLRenderTarget(1, 1, {
        type: THREE.HalfFloatType,
        depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      })
    : undefined
  const atmosphereCopy = atmosphereTarget
    ? new THREE.ShaderMaterial({
        uniforms: {
          colorBuffer: { value: atmosphereTarget.texture },
          depthBuffer: { value: atmosphereTarget.depthTexture },
          sourceSize: { value: new THREE.Vector2(1, 1) },
          progress: uniforms.uProgress,
          meteor: uniforms.uMeteor,
          meteorVisibility: uniforms.uMeteorVisibility,
          aspect: uniforms.uAspect,
        },
        vertexShader: screenVertex,
        fragmentShader: `uniform sampler2D colorBuffer; uniform sampler2D depthBuffer;
      uniform vec2 sourceSize; uniform float progress; uniform vec4 meteor;
      uniform float meteorVisibility;
      uniform float aspect; varying vec2 vUv;
      vec4 cubic(float v) {
        vec4 n=vec4(1.0,2.0,3.0,4.0)-v;
        vec4 s=n*n*n;
        float x=s.x;
        float y=s.y-4.0*x;
        float z=s.z-4.0*y-10.0*x;
        float w=6.0-x-y-z;
        return vec4(x,y,z,w)/6.0;
      }
      vec4 bicubic(sampler2D image,vec2 uv) {
        vec2 pixel=uv*sourceSize-.5;
        vec2 fraction=fract(pixel);
        pixel-=fraction;
        vec4 xc=cubic(fraction.x),yc=cubic(fraction.y);
        vec4 center=vec4(pixel.x-.5,pixel.x+1.5,pixel.y-.5,pixel.y+1.5);
        vec4 sum=vec4(xc.x+xc.y,xc.z+xc.w,yc.x+yc.y,yc.z+yc.w);
        vec4 offset=center+vec4(xc.y,xc.w,yc.y,yc.w)/sum;
        offset/=sourceSize.xxyy;
        vec4 a=texture2D(image,offset.xz),b=texture2D(image,offset.yz);
        vec4 c=texture2D(image,offset.xw),d=texture2D(image,offset.yw);
        float sx=sum.x/(sum.x+sum.y),sy=sum.z/(sum.z+sum.w);
        return mix(mix(d,c,sx),mix(b,a,sx),sy);
      }
      void main(){
        vec4 reconstructed=bicubic(colorBuffer,vUv);
        // B-spline reconstruction is stable but visibly soft at the efficient
        // atmosphere ratio. Restore bounded local contrast from the hardware-
        // filtered source, especially through the ocean, without another pass
        // or another procedural world evaluation.
        vec4 direct=texture2D(colorBuffer,vUv);
        float ocean=smoothstep(.9,1.35,progress)*(1.0-smoothstep(3.15,3.65,progress));
        // The opening ridge is a hard silhouette. Mixing the coarse direct
        // sample back over its bicubic reconstruction exposed the source grid
        // as visible steps. Restore local contrast only as the camera clears
        // the dune, reaching the stronger ocean treatment at its old timing.
        float detailRestore=smoothstep(.18,.82,progress)*mix(.18,.52,ocean);
        vec3 c=mix(reconstructed,direct,detailRestore).rgb;
        // On the efficient path this composite is written directly to the
        // canvas. Keep the restrained meteor at display resolution without a
        // second full-screen render target/pass.
        if(meteor.x>=0.0) {
          float seed=fract(meteor.y*3.7);
          float side=step(.5,fract(meteor.y*17.13));
          vec2 point=vec2(vUv.x*aspect,vUv.y);
          vec2 start=mix(vec2(.045*aspect,.86+seed*.055),vec2(.955*aspect,.84+seed*.045),side);
          float fall=mix(-.12,-.22,seed);
          vec2 direction=normalize(mix(vec2(.99,fall),vec2(-.99,fall),side));
          vec2 head=start+direction*(mix(-.025,.58,meteor.x)*aspect);
          vec2 delta=point-head;
          float along=dot(delta,direction);
          float across=abs(delta.x*direction.y-delta.y*direction.x);
          float tailLength=.25*aspect;
          float tailPosition=clamp(-along/max(tailLength,.001),0.0,1.0);
          float behind=step(-tailLength,along)*(1.0-step(0.0,along));
          float taper=pow(1.0-tailPosition,1.45)*behind;
          float width=mix(.0011,.0038,pow(1.0-tailPosition,1.7));
          float tailCore=exp(-pow(across/max(width,.0005),2.0)*1.8)*taper;
          float tailVeil=exp(-pow(across/.010,2.0)*1.4)*taper*(1.0-tailPosition)*.12;
          float headCore=exp(-dot(delta,delta)*85000.0);
          float headGlow=exp(-dot(delta,delta)*4200.0);
          float eventFade=smoothstep(0.0,.13,meteor.x)*(1.0-smoothstep(.76,1.0,meteor.x))*meteorVisibility;
          vec3 meteorColor=mix(vec3(.42,.57,.72),vec3(.68,.46,.39),seed);
          c+=meteorColor*(tailCore*.46+tailVeil+headCore*.92+headGlow*.14)*eventFade;
        }
        gl_FragColor=vec4(pow(vec3(1.0)-exp(-max(c,vec3(0.0))*1.35),vec3(.92)),1.0);
        gl_FragDepth=texture2D(depthBuffer,vUv).r;
      }`,
        depthTest: true,
        depthWrite: true,
      })
    : undefined
  const compositeBackground = new THREE.Scene()
  if (atmosphereCopy) compositeBackground.add(new THREE.Mesh(quadGeometry, atmosphereCopy))
  const renderTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: efficient ? 0 : Math.min(4, renderer.capabilities.maxSamples),
    depthBuffer: true,
  })
  const composer = new EffectComposer(renderer, renderTarget)
  const backgroundPass = new RenderPass(efficient ? compositeBackground : background, screenCamera)
  const scenePass = new RenderPass(scene, camera)
  scenePass.clear = false
  scenePass.clearDepth = false
  const bloom = efficient ? undefined : new UnrealBloomPass(new THREE.Vector2(1, 1), 0.48, 0, 1.05)
  // Very coarse mip levels create visibly offset/blocky lobes around the sun.
  // Keep bloom's fine halo; the analytic lens shader supplies its broad glow.
  if (bloom) bloom.compositeMaterial.uniforms.bloomFactors!.value = [1, 0.65, 0.25, 0.08, 0.02]
  const grade = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      texel: { value: new THREE.Vector2() },
      haloEnabled: { value: quality.halo ? 1 : 0 },
      meteor: { value: new THREE.Vector4(-1, 0, 0, 0) },
      meteorVisibility: { value: 1 },
      aspect: { value: 1 },
    },
    vertexShader: screenVertex,
    fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 texel; uniform float haloEnabled;
      uniform vec4 meteor; uniform float meteorVisibility; uniform float aspect; varying vec2 vUv;
      void main(){vec3 center=max(texture2D(tDiffuse,vUv).rgb,vec3(0));vec3 c=center;
      ${
        efficient
          ? `
      // The foreground is already supersampled and the low-resolution
      // atmosphere is reconstructed in its copy shader. Avoid filtering the
      // combined image a second time; it softened details and duplicated taps.
      if(haloEnabled>.5) {
        vec2 radius=texel*3.0;
        vec3 halo=max(texture2D(tDiffuse,vUv+radius).rgb-vec3(1.05),vec3(0.0));
        halo+=max(texture2D(tDiffuse,vUv+vec2(-radius.x,radius.y)).rgb-vec3(1.05),vec3(0.0));
        halo+=max(texture2D(tDiffuse,vUv+vec2(radius.x,-radius.y)).rgb-vec3(1.05),vec3(0.0));
        halo+=max(texture2D(tDiffuse,vUv-radius).rgb-vec3(1.05),vec3(0.0));
        c+=halo*.07;
      }
      `
          : ''
      }
      // Keep the streak in this full-resolution pass. Drawing it into the
      // intentionally soft mobile atmosphere target destroys its tapered edge.
      if(meteor.x>=0.0) {
        float seed=fract(meteor.y*3.7);
        float side=step(.5,fract(meteor.y*17.13));
        vec2 point=vec2(vUv.x*aspect,vUv.y);
        vec2 start=mix(vec2(.045*aspect,.86+seed*.055),vec2(.955*aspect,.84+seed*.045),side);
        float fall=mix(-.12,-.22,seed);
        vec2 direction=normalize(mix(vec2(.99,fall),vec2(-.99,fall),side));
        vec2 head=start+direction*(mix(-.025,.58,meteor.x)*aspect);
        vec2 delta=point-head;
        float along=dot(delta,direction);
        float across=abs(delta.x*direction.y-delta.y*direction.x);
        float tailLength=.25*aspect;
        float tailPosition=clamp(-along/max(tailLength,.001),0.0,1.0);
        float behind=step(-tailLength,along)*(1.0-step(0.0,along));
        float taper=pow(1.0-tailPosition,1.45)*behind;
        float width=mix(.0011,.0038,pow(1.0-tailPosition,1.7));
        float tailCore=exp(-pow(across/max(width,.0005),2.0)*1.8)*taper;
        float tailVeil=exp(-pow(across/.010,2.0)*1.4)*taper*(1.0-tailPosition)*.12;
        float headCore=exp(-dot(delta,delta)*85000.0);
        float headGlow=exp(-dot(delta,delta)*4200.0);
        float eventFade=smoothstep(0.0,.13,meteor.x)*(1.0-smoothstep(.76,1.0,meteor.x))*meteorVisibility;
        vec3 meteorColor=mix(vec3(.42,.57,.72),vec3(.68,.46,.39),seed);
        c+=meteorColor*(tailCore*.46+tailVeil+headCore*.92+headGlow*.14)*eventFade;
      }
      gl_FragColor=vec4(pow(vec3(1)-exp(-c*1.35),vec3(.92)),1);}`,
  })
  composer.addPass(backgroundPass)
  composer.addPass(scenePass)
  if (bloom) composer.addPass(bloom)
  composer.addPass(grade)

  // Stable seeds allow every particle to survive the entire journey.
  let seed = 1709
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const count = 12000
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
  const particleGroups = new Float32Array(count)
  particleGroups.fill(-1)
  const groupAttribute = new THREE.BufferAttribute(particleGroups, 1)
  geometry.setAttribute('aGroup', groupAttribute)
  geometry.setDrawRange(0, Math.floor(count * quality.particleFraction))
  const particleUniforms = {
    uAspect: uniforms.uAspect,
    uTime: uniforms.uTime,
    uProgress: uniforms.uProgress,
    uCosmicTime: uniforms.uCosmicTime,
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
  if (efficient) {
    material.fragmentShader = material.fragmentShader.replace(
      'gl_FragColor=vec4(vColor,glow*vAlpha*coverage);',
      `vec4 particleColor=vec4(vColor,glow*vAlpha*coverage);
      particleColor.rgb=pow(vec3(1.0)-exp(-max(particleColor.rgb,vec3(0.0))*1.35),vec3(.92));
      gl_FragColor=particleColor;`,
    )
  }
  const particles = new THREE.Points(geometry, material)
  particles.frustumCulled = false
  scene.add(particles)

  // Explicit, source-backed star paths replace the random nearest-neighbor graph.
  // Resolution-aware ribbons avoid WebGL's un-antialiased one-pixel native
  // lines. They follow the same star endpoints and coherent drift.
  const initialLines = constellationLayout(1)
  const lineGeometry = new THREE.InstancedBufferGeometry()
  lineGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 0, 1, 0, 1, 1, 0], 3),
  )
  lineGeometry.setIndex([0, 1, 2, 2, 1, 3])
  const lineCount = initialLines.lines.length / 6
  lineGeometry.instanceCount = lineCount
  lineGeometry.setAttribute(
    'aStart',
    new THREE.InstancedBufferAttribute(new Float32Array(lineCount * 3), 3),
  )
  lineGeometry.setAttribute(
    'aEnd',
    new THREE.InstancedBufferAttribute(new Float32Array(lineCount * 3), 3),
  )
  lineGeometry.setAttribute(
    'color',
    new THREE.InstancedBufferAttribute(new Float32Array(lineCount * 3), 3),
  )
  lineGeometry.setAttribute(
    'aGroup',
    new THREE.InstancedBufferAttribute(new Float32Array(lineCount), 1),
  )
  const lineMaterial = new THREE.ShaderMaterial({
    vertexShader: constellationLineVertex,
    fragmentShader: constellationLineFragment,
    uniforms: {
      uCosmicTime: uniforms.uCosmicTime,
      uOpacity: { value: 0 },
      uResolution: { value: new THREE.Vector2() },
      uLineWidth: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  if (efficient)
    lineMaterial.fragmentShader = lineMaterial.fragmentShader.replace(
      'gl_FragColor=vec4(vColor,uOpacity*coverage);',
      `vec4 lineColor=vec4(vColor,uOpacity*coverage);
      lineColor.rgb=pow(vec3(1.0)-exp(-max(lineColor.rgb,vec3(0.0))*1.35),vec3(.92));
      gl_FragColor=lineColor;`,
    )
  const constellationLines = new THREE.Mesh(lineGeometry, lineMaterial)
  constellationLines.frustumCulled = false
  scene.add(constellationLines)

  const oasisDressing = createOasisDressing(scene, camera, efficient)

  let ratio = quality.atmosphereRatio
  let disposed = false,
    visible = true,
    frame = 0,
    last = 0,
    elapsed = 0,
    cosmicElapsed = 0
  let meteorIndex = 0,
    meteorStart = 3.8,
    meteorDuration = 1.1
  let sampleStart = performance.now(),
    sampleFrames = 0,
    lastRender = sampleStart
  let progress = 0
  let requestedProgress = 0
  let lastProgressRequest = 0
  let previousCallback = 0
  let rawInterval: number | null = null
  let bufferWidth = 0,
    bufferHeight = 0
  const drawingSize = new THREE.Vector2()
  let qualityWindow = performance.now(),
    qualityFrames = 0,
    healthyWindows = 0,
    pressuredWindows = 0
  let qualityCooldown = 0
  const callbackIntervals: number[] = []
  let windowUpdateCost = 0
  let peakGpuPerScale = 0
  let surfaceWidth = 0,
    surfaceHeight = 0
  let surfaceDpr = window.devicePixelRatio
  let cameraUpdates = 0
  let frozenProgress: number | undefined, frozenTime: number | undefined
  let drawingPaused = false
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
    const bounds = canvas.getBoundingClientRect()
    const width = Math.round(bounds.width) || window.innerWidth
    // Safari toolbar movement changes innerHeight during a swipe. Keep the
    // large viewport surface stable, including its expensive bloom targets.
    const height = Math.round(bounds.height) || window.innerHeight
    surfaceWidth = width
    surfaceHeight = height
    const foregroundRatio = quality.foregroundRatio
    renderer.setPixelRatio(foregroundRatio)
    renderer.setSize(width, height, false)
    renderer.getDrawingBufferSize(drawingSize)
    bufferWidth = drawingSize.x
    bufferHeight = drawingSize.y
    if (!efficient) {
      composer.setPixelRatio(foregroundRatio)
      composer.setSize(width, height)
    }
    const atmosphereWidth = Math.max(1, Math.round(width * ratio))
    const atmosphereHeight = Math.max(1, Math.round(height * ratio))
    atmosphereTarget?.setSize(atmosphereWidth, atmosphereHeight)
    atmosphereCopy?.uniforms.sourceSize!.value.set(atmosphereWidth, atmosphereHeight)
    grade.uniforms.texel!.value.set(1 / (width * foregroundRatio), 1 / (height * foregroundRatio))
    grade.uniforms.aspect!.value = width / height
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    uniforms.uAspect.value = width / height
    const layout = constellationLayout(width / height)
    for (let i = 0; i < constellationStarCount; i++) {
      anchors.setXYZW(
        i,
        layout.anchors[i * 4]!,
        layout.anchors[i * 4 + 1]!,
        layout.anchors[i * 4 + 2]!,
        1,
      )
      groupAttribute.setX(i, layout.starGroups[i]!)
    }
    anchors.needsUpdate = true
    groupAttribute.needsUpdate = true
    const starts = lineGeometry.getAttribute('aStart') as THREE.BufferAttribute
    const ends = lineGeometry.getAttribute('aEnd') as THREE.BufferAttribute
    const colors = lineGeometry.getAttribute('color') as THREE.BufferAttribute
    const groups = lineGeometry.getAttribute('aGroup') as THREE.BufferAttribute
    for (let i = 0; i < lineCount; i++) {
      starts.setXYZ(i, layout.lines[i * 6]!, layout.lines[i * 6 + 1]!, layout.lines[i * 6 + 2]!)
      ends.setXYZ(i, layout.lines[i * 6 + 3]!, layout.lines[i * 6 + 4]!, layout.lines[i * 6 + 5]!)
      colors.setXYZ(i, layout.colors[i * 6]!, layout.colors[i * 6 + 1]!, layout.colors[i * 6 + 2]!)
      groups.setX(i, layout.lineGroups[i * 2]!)
    }
    for (const attribute of [starts, ends, colors, groups]) attribute.needsUpdate = true
    lineMaterial.uniforms.uResolution!.value.set(bufferWidth, bufferHeight)
    lineMaterial.uniforms.uLineWidth!.value = foregroundRatio * 0.65
    particleUniforms.uPixelRatio.value = foregroundRatio
    canvas.dataset.pixelRatio = foregroundRatio.toFixed(2)
    canvas.dataset.atmosphereRatio = ratio.toFixed(2)
    canvas.dataset.qualityStep = String(quality.step)
    canvas.dataset.bufferWidth = String(bufferWidth)
    canvas.dataset.bufferHeight = String(bufferHeight)
    canvas.dataset.atmosphereWidth = String(atmosphereTarget?.width || bufferWidth)
    canvas.dataset.atmosphereHeight = String(atmosphereTarget?.height || bufferHeight)
    canvas.dataset.msaaSamples = String(efficient ? 0 : renderTarget.samples)
    canvas.dataset.bloomEnabled = String(bloom?.enabled || false)
    frameProfiler?.event('buffers-resized', {
      width,
      height,
      bufferWidth,
      bufferHeight,
      atmosphereWidth,
      atmosphereHeight,
    })
  }
  function updateCamera(value: number) {
    cameraUpdates++
    progress = THREE.MathUtils.clamp(value, 0, 5)
    uniforms.uProgress.value = progress
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
      const width = 0.045
      if (Math.abs(x) >= width) continue
      const incoming = 1 / (key.at - cameraKeys[boundary - 1]!.at)
      const outgoing = 1 / (cameraKeys[boundary + 1]!.at - key.at)
      const u = (x + width) / (2 * width)
      const softHinge = 2 * width * (u * u * u - 0.5 * u * u * u * u)
      pathIndex += (outgoing - incoming) * (softHinge - Math.max(0, x))
    }
    const t = pathIndex / (cameraKeys.length - 1)
    positionsPath.getPoint(t, camera.position)
    targetsPath.getPoint(t, target)
    // Ride the flood at the surface, then keep the same relative-depth dive.
    const rise = cameraFloodRise(progress, camera.position.y)
    camera.position.y += rise
    target.y += rise
    const weather = stormStrength(progress)
    const curtain =
      THREE.MathUtils.smoothstep(progress, 1.4, 1.59) *
      (1 - THREE.MathUtils.smoothstep(progress, 1.94, 2.12))
    // Hold the separately rendered oasis dressing inside the warm ridge haze
    // while its opacity settles. Without this veil, palms and rocks resolve as
    // visibly fading meshes the instant the camera begins to clear the dune.
    // The haze lifts before the discovery framing settles, preserving the
    // oasis contrast instead of globally flattening the chapter.
    const crestVeil =
      THREE.MathUtils.smoothstep(progress, 0.16, 0.34) *
      (1 - THREE.MathUtils.smoothstep(progress, 0.52, 0.82))
    const fog = scene.fog as THREE.Fog
    fog.near = THREE.MathUtils.lerp(THREE.MathUtils.lerp(35, 28, crestVeil), 12, curtain)
    fog.far = THREE.MathUtils.lerp(THREE.MathUtils.lerp(150, 112, crestVeil), 62, curtain)
    scene.fog!.color.setRGB(0.6, 0.42, 0.25).lerp(stormFog, weather)
    camera.lookAt(target)
    lineMaterial.uniforms.uOpacity!.value = THREE.MathUtils.smoothstep(progress, 3.75, 4.15) * 0.25
    constellationLines.visible = lineMaterial.uniforms.uOpacity!.value > 0.0001
    const meteorVisibility = meteorChapterVisibility(progress)
    uniforms.uMeteorVisibility.value = meteorVisibility
    grade.uniforms.meteorVisibility!.value = meteorVisibility
    oasisDressing.setProgress(progress)
  }
  function setProgress(value: number) {
    const next = THREE.MathUtils.clamp(frozenProgress ?? value, 0, 5)
    if (next !== requestedProgress) lastProgressRequest = performance.now()
    requestedProgress = next
  }
  function draw(now: number) {
    if (disposed) return
    frame = requestAnimationFrame(draw)
    rawInterval = previousCallback ? now - previousCallback : null
    previousCallback = now
    if (
      rawInterval !== null &&
      rawInterval > 0 &&
      rawInterval < 200 &&
      callbackIntervals.length < 240
    )
      callbackIntervals.push(rawInterval)
    if (!visible || document.hidden) {
      last = now
      lastRender = now
      sampleStart = now
      sampleFrames = 0
      qualityWindow = now
      qualityFrames = 0
      windowUpdateCost = 0
      callbackIntervals.length = 0
      healthyWindows = 0
      pressuredWindows = 0
      previousCallback = 0
      frameProfiler?.pause()
      return
    }
    frameProfiler?.callback(now)
    const targetFps =
      now - lastProgressRequest < 750 || elapsed < 1.8 || frozenProgress !== undefined ? 60 : 30
    // A 30 Hz callback can arrive a fraction early (notably low-power iOS).
    // Do not skip it and accidentally alternate 33/66 ms frames.
    const frameTime = nextFrameTime(now, last, targetFps)
    if (frameTime === null) return
    const updateStart = performance.now()
    const seconds = Math.min(now - lastRender, 100) / 1000
    elapsed += seconds
    if (progress > 3.45) cosmicElapsed += seconds
    // Consume only the freshest scroll position once per new scene frame.
    // DOM scrolling stays independent; no second touch-only lag is added.
    if (requestedProgress !== progress) updateCamera(requestedProgress)
    lastRender = now
    last = frameTime
    uniforms.uTime.value = elapsed
    uniforms.uCosmicTime.value = cosmicElapsed
    if (cosmicElapsed >= meteorStart) {
      const phase = (cosmicElapsed - meteorStart) / meteorDuration
      if (phase <= 1) uniforms.uMeteor.value.set(phase, meteorIndex + 0.371, 0, 0)
      else {
        meteorIndex++
        const irregular = Math.sin(meteorIndex * 91.713 + 4.17) * 43758.5453
        meteorStart = cosmicElapsed + 12 + (irregular - Math.floor(irregular)) * 8
        meteorDuration = 0.8 + ((((irregular * 1.73) % 1) + 1) % 1) * 0.6
        uniforms.uMeteor.value.x = -1
      }
    } else uniforms.uMeteor.value.x = -1
    const meteorUniform = grade.uniforms.meteor!.value as THREE.Vector4
    if (frozenTime !== undefined) {
      uniforms.uTime.value = frozenTime
      uniforms.uCosmicTime.value = frozenTime
      uniforms.uMeteor.value.set(progress > 3.45 ? 0.5 : -1, 0.371, 0, 0)
    }
    meteorUniform.copy(uniforms.uMeteor.value)
    const lightning = lightningState(frozenTime ?? elapsed)
    uniforms.uLightning.value.set(lightning.intensity, lightning.seed)
    oasisDressing.setTime(frozenTime ?? elapsed)
    // Only a top-of-page arrival gets a low-to-high reveal. A restored/deep-link
    // chapter uses its normal camera immediately, never a trip through the desert.
    const emergence =
      (1 - THREE.MathUtils.smoothstep(elapsed, 0, 1.8)) *
      (1 - THREE.MathUtils.smoothstep(progress, 0, 0.08))
    const cameraY = camera.position.y,
      targetY = target.y
    camera.position.y -= emergence * 1.8
    target.y -= emergence * 3.2
    camera.lookAt(target)
    const updateMs = performance.now() - updateStart
    if (drawingPaused) {
      camera.position.y = cameraY
      target.y = targetY
      return
    }
    const start = performance.now()
    frameProfiler?.begin(now)
    renderer.info.reset()
    if (atmosphereTarget) {
      renderer.setRenderTarget(atmosphereTarget)
      renderer.clear()
      renderer.render(background, screenCamera)
      renderer.setRenderTarget(null)
    }
    if (efficient) {
      renderer.setRenderTarget(null)
      renderer.clear()
      renderer.render(compositeBackground, screenCamera)
      renderer.render(scene, camera)
    } else composer.render()
    const cost = performance.now() - start
    const gpuCost = frameProfiler?.gpuCost()
    if (gpuCost !== null && gpuCost !== undefined && elapsed > 2)
      peakGpuPerScale = Math.max(
        peakGpuPerScale * Math.exp(-seconds / 120),
        gpuCost / (ratio * ratio),
      )
    qualityFrames++
    windowUpdateCost += cost + updateMs
    frameProfiler?.end(now, cost, renderer.info, quality, progress, {
      updateMs,
      rawInterval,
      requestedProgress,
      requestAgeMs:
        now - lastProgressRequest < 750
          ? Math.max(0, performance.now() - lastProgressRequest)
          : null,
      targetFps,
      bufferWidth,
      bufferHeight,
      atmosphereWidth: atmosphereTarget?.width || bufferWidth,
      atmosphereHeight: atmosphereTarget?.height || bufferHeight,
    })
    camera.position.y = cameraY
    target.y = targetY
    if (firstFrame) {
      firstFrame = false
      onFirstFrame?.()
    }
    sampleFrames++
    if (now - sampleStart > 2000) {
      canvas.dataset.fps = ((sampleFrames * 1000) / (now - sampleStart)).toFixed(1)
      canvas.dataset.drawCalls = String(renderer.info.render.calls)
      canvas.dataset.triangles = String(renderer.info.render.triangles)
      canvas.dataset.points = String(renderer.info.render.points)
      canvas.dataset.programs = String(renderer.info.programs?.length || 0)
      canvas.dataset.progress = progress.toFixed(3)
      canvas.dataset.cameraHeight = camera.position.y.toFixed(2)
      canvas.dataset.waterHeight = (-1 + floodHeight(progress)).toFixed(2)
      canvas.dataset.storm = stormStrength(progress).toFixed(2)
      canvas.dataset.lightning = (lightning.intensity * stormStrength(progress)).toFixed(3)
      canvas.dataset.cosmicTime = cosmicElapsed.toFixed(2)
      canvas.dataset.meteorCount = String(meteorIndex)
      canvas.dataset.meteorActive = uniforms.uMeteor.value.x >= 0 ? 'true' : 'false'
      canvas.dataset.meteorVisibility = uniforms.uMeteorVisibility.value.toFixed(3)
      canvas.dataset.qualityStep = String(quality.step)
      canvas.dataset.targetFps = String(targetFps)
      sampleStart = now
      sampleFrames = 0
    }
    // Capacity is measured across complete windows, not from the render-cap
    // clock's remainder. A regular 30 Hz callback stream isn't a power-mode
    // detector and must not accidentally receive another 30 Hz throttle.
    if (now - qualityWindow >= 2000 && frozenProgress === undefined) {
      const spacing = callbackIntervals.sort((a, b) => a - b)
      const baseInterval = spacing[Math.floor(spacing.length * 0.2)] || 1000 / 60
      const observedTarget = baseInterval >= 28 ? 30 : 60
      const fps = (qualityFrames * 1000) / (now - qualityWindow)
      const stableCallbacks =
        (spacing[Math.floor(spacing.length * 0.95)] || 100) <= (1000 / observedTarget) * 1.12
      const healthy =
        targetFps === 60 &&
        fps >= observedTarget - 2 &&
        stableCallbacks &&
        windowUpdateCost / Math.max(1, qualityFrames) < (1000 / observedTarget) * 0.4
      healthyWindows = healthy ? healthyWindows + 1 : 0
      pressuredWindows = targetFps === 60 && fps < observedTarget - 5 ? pressuredWindows + 1 : 0
      let next = quality
      if (elapsed > 3 && now >= qualityCooldown) {
        if (pressuredWindows >= 2) {
          next = degradeQuality(quality)
          qualityCooldown = now + 10000
        } else if (healthyWindows >= 3) {
          const proposed = recoverQuality(quality, window.devicePixelRatio)
          if (
            !peakGpuPerScale ||
            peakGpuPerScale * proposed.atmosphereRatio ** 2 < (1000 / observedTarget) * 0.65
          )
            next = proposed
          healthyWindows = 0
        }
      }
      if (next !== quality) {
        applyQuality(next)
      }
      canvas.dataset.observedCallbackCadence = String(observedTarget)
      qualityWindow = now
      qualityFrames = 0
      windowUpdateCost = 0
      callbackIntervals.length = 0
    }
  }
  function applyQuality(next: typeof quality) {
    const resized =
      next.atmosphereRatio !== quality.atmosphereRatio ||
      next.foregroundRatio !== quality.foregroundRatio
    const recovering = next.atmosphereRatio > quality.atmosphereRatio
    quality = next
    ratio = quality.atmosphereRatio
    uniforms.uDetail.value = quality.detail ? 1 : 0
    grade.uniforms.haloEnabled!.value = quality.halo ? 1 : 0
    if (bloom) bloom.enabled = quality.halo
    geometry.setDrawRange(0, Math.floor(count * quality.particleFraction))
    frameProfiler?.event(recovering ? 'quality-recovered' : 'quality-degraded', {
      step: quality.step,
      ratio,
      particles: geometry.drawRange.count,
      halo: quality.halo,
      detail: quality.detail,
    })
    if (resized) resize()
    canvas.dataset.bloomEnabled = String(bloom?.enabled || false)
  }
  if (frameProfiler?.enabled)
    window.__matrixWorldDebug = {
      setProgress,
      setQuality: (patch) => applyQuality({ ...quality, ...patch }),
      freeze: (value, seconds) => {
        frozenProgress = value
        frozenTime = seconds
        setProgress(value)
      },
      resume: () => {
        frozenProgress = undefined
        frozenTime = undefined
      },
      pauseDrawing: (paused) => {
        drawingPaused = paused
        frameProfiler?.event('drawing-paused', { paused })
      },
      snapshot: () => ({
        quality: { ...quality },
        cameraUpdates,
        progress,
        requestedProgress,
        buffer: { width: bufferWidth, height: bufferHeight },
        atmosphere: {
          width: atmosphereTarget?.width || bufferWidth,
          height: atmosphereTarget?.height || bufferHeight,
        },
        composer: { width: composer.readBuffer.width, height: composer.readBuffer.height },
        bloomEnabled: bloom?.enabled || false,
        enabledPasses: composer.passes.filter((pass) => pass.enabled).length,
        detailUniform: uniforms.uDetail.value,
        haloUniform: grade.uniforms.haloEnabled!.value,
        particleCount: geometry.drawRange.count,
        drawCalls: renderer.info.render.calls,
        glAntialias: gl.getContextAttributes()?.antialias,
        css: { width: surfaceWidth, height: surfaceHeight },
      }),
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
    const bounds = canvas.getBoundingClientRect()
    if (window.devicePixelRatio !== surfaceDpr) {
      surfaceDpr = window.devicePixelRatio
      applyQuality({
        ...quality,
        foregroundRatio: Math.min(surfaceDpr, efficient ? 3 : 2),
        atmosphereRatio: efficient
          ? Math.min(surfaceDpr, quality.atmosphereRatio)
          : Math.min(surfaceDpr, 2),
      })
    }
    if (Math.round(bounds.width) === surfaceWidth && Math.round(bounds.height) === surfaceHeight)
      return
    resize()
  }
  window.addEventListener('resize', onResize, { passive: true })
  resize()
  updateCamera(0)
  // Compile the expensive world and foreground programs before the static
  // preview releases. Supporting drivers use parallel shader compilation and
  // avoids paying the whole link cost in the first visible frame.
  const compileStarted = performance.now()
  canvas.dataset.compileState = 'pending'
  Promise.all([
    renderer.compileAsync(background, screenCamera),
    oasisDressing.ready.then(async () => {
      const palmParts = oasisDressing.getPalmPartCounts()
      canvas.dataset.palmTrunkParts = String(palmParts.trunk)
      canvas.dataset.palmFoliageParts = String(palmParts.foliage)
      // Hidden objects are skipped by WebGLRenderer.compileAsync. Reveal the
      // complete grove only during preparation, compile it, then restore
      // the actual scroll state before the first presented frame.
      oasisDressing.setProgress(0.8, true)
      try {
        await renderer.compileAsync(scene, camera)
        // compileAsync links programs but some mobile drivers defer geometry,
        // texture and framebuffer work until an actual draw. Warm the same
        // Exercise mobile geometry and texture upload before the preview
        // releases. The efficient path presents directly to the canvas, so it
        // does not allocate the old full-size half-float composer target.
        if (efficient) {
          const previousTarget = renderer.getRenderTarget()
          renderer.setRenderTarget(null)
          renderer.clear()
          renderer.render(scene, camera)
          renderer.setRenderTarget(previousTarget)
        }
      } finally {
        oasisDressing.setProgress(progress, true)
      }
    }),
    ...(atmosphereCopy ? [renderer.compileAsync(compositeBackground, screenCamera)] : []),
  ])
    .then(() => {
      canvas.dataset.compileState = 'ready'
    })
    .catch(() => {
      // Some older drivers do not expose a reliable parallel-compile path.
      // Rendering remains the functional fallback and will compile on demand.
      canvas.dataset.compileState = 'fallback'
    })
    .finally(() => {
      canvas.dataset.compileMs = (performance.now() - compileStarted).toFixed(1)
      if (!disposed) frame = requestAnimationFrame(draw)
    })
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
      atmosphereCopy?.dispose()
      atmosphereTarget?.dispose()
      backgroundPass.dispose()
      scenePass.dispose()
      bloom?.dispose()
      grade.dispose()
      frameProfiler?.dispose()
      if (frameProfiler?.enabled) delete window.__matrixWorldDebug
      composer.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
