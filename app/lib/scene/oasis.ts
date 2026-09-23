import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { terrainGLSL, stormStrength, floodHeight } from './shaders'

// Placement follows the analytic basin in shaders.ts. The omitted micro-noise
// is under 0.24 units; roots are buried slightly to avoid floating on ripples.
function ground(x: number, z: number) {
  const ridge = z + 3 - x * 0.27 - 2.5 * Math.sin(x * 0.065)
  const width = THREE.MathUtils.lerp(5.5, 13, THREE.MathUtils.smoothstep(ridge, -1, 1))
  const bx = (x - 7) * 0.04 + Math.sin(z * 0.11) * 0.13
  const bz = (z + 44) * 0.033 + Math.sin(x * 0.13) * 0.13
  const r = Math.hypot(bx, bz)
  return (
    2.7 * Math.sin(z * 0.062 + x * 0.084) +
    1.9 * Math.sin(z * 0.034 - x * 0.049) +
    0.65 * Math.sin(x * 0.18 + z * 0.12) +
    8 * Math.exp((-ridge * ridge) / (width * width)) +
    4 * Math.exp(-(((r - 1.35) * 4) ** 2)) -
    1 -
    10.5 * Math.exp(-r * r * 1.3)
  )
}

function bank(angle: number, inland = 0) {
  // Two loose planting islands replace the evenly scattered central shoreline.
  // Palms, reeds, stones and dry-bank plants share these anchors, while their
  // inland offsets preserve depth and the outer framing stays untouched.
  if (angle > -1.85 && angle < -.35) {
    const cluster = angle < -1.1 ? -1.47 : -.72
    angle = THREE.MathUtils.lerp(angle, cluster, .46)
  }
  let radius = 0.6
  const point = new THREE.Vector3()
  for (; radius < 1.7; radius += 0.012) {
    point.set(7 + (Math.cos(angle) * radius) / 0.04, 0, -44 + (Math.sin(angle) * radius) / 0.033)
    if (ground(point.x, point.z) > 0.15) break
  }
  radius += inland
  point.set(7 + (Math.cos(angle) * radius) / 0.04, 0, -44 + (Math.sin(angle) * radius) / 0.033)
  point.y = ground(point.x, point.z) - 0.08
  return point
}

export function createOasisDressing(scene: THREE.Scene, camera: THREE.Camera) {
  const group = new THREE.Group()
  const wind = { value: 0 }
  const windStrength = { value: 0 }
  let lastWindTime: number | undefined
  const expansionUniform = { value: 0 }
  const waterLevel = { value: -1 }
  // Ground clipping shares the exact terrain function with the fullscreen world.
  // Buried geometry must not draw through it just because it uses another pass.
  function groundMaterial(material: THREE.Material) {
    const previousCompile = material.onBeforeCompile.bind(material)
    const previousCacheKey = material.customProgramCacheKey.bind(material)
    material.onBeforeCompile = (shader, renderer) => {
      previousCompile(shader, renderer)
      shader.uniforms.oasisExpansion = expansionUniform
      shader.uniforms.oasisWaterLevel = waterLevel
      shader.vertexShader =
        'varying vec3 oasisWorld;\n' +
        shader.vertexShader.replace(
          '#include <project_vertex>',
          `
        vec4 bankWorld = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          bankWorld = instanceMatrix * bankWorld;
        #endif
        oasisWorld = (modelMatrix * bankWorld).xyz;
        #include <project_vertex>`,
        )
      shader.fragmentShader =
        'varying vec3 oasisWorld; uniform float oasisExpansion; uniform float oasisWaterLevel;\n' +
        terrainGLSL +
        shader.fragmentShader.replace(
          '#include <clipping_planes_fragment>',
          `
        #include <clipping_planes_fragment>
        if (oasisWorld.y < max(oasisWaterLevel, terrain(oasisWorld.xz, 1.0, oasisExpansion) - .025)) discard;`,
        ).replace(
          '#include <alphatest_fragment>',
          `
        // Cut out the leaf texture independently of the whole-grove reveal.
        // Testing opacity * texture alpha made entire canopies pop at alphaTest.
        diffuseColor.a /= max(opacity, .0001);
        #include <alphatest_fragment>
        diffuseColor.a *= opacity;`,
        )
    }
    material.customProgramCacheKey = () => `${previousCacheKey()}-oasis-ground-v2`
  }
  scene.add(group)
  const fill = new THREE.HemisphereLight('#f4dfb1', '#46644c', 2.1)
  const sun = new THREE.DirectionalLight('#ffe1b0', 2.4)
  sun.position.set(24, 35, -25)
  group.add(fill, sun)
  const materials = new Set<THREE.Material>()
  const geometries = new Set<THREE.BufferGeometry>()
  const textures = new Set<THREE.Texture>()
  const accentMeshes = new Set<THREE.InstancedMesh>()
  const palmPlacements: { origin: THREE.Vector3; scale: number; rotation: number }[] = []
  const palmInstances: THREE.InstancedMesh[] = []
  const palmPartCounts = { trunk: 0, foliage: 0 }
  const groveCenter = new THREE.Vector3(7, 0, -44)
  let disposed = false,
    progress = -1
  let seed = 3241
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }

  const sourceRockGeometry = new THREE.IcosahedronGeometry(1, 2)
  sourceRockGeometry.deleteAttribute('normal')
  sourceRockGeometry.deleteAttribute('uv')
  const rockGeometry = mergeVertices(sourceRockGeometry)
  sourceRockGeometry.dispose()
  const vertices = rockGeometry.getAttribute('position')
  for (let i = 0; i < vertices.count; i++) {
    const x = vertices.getX(i),
      y = vertices.getY(i),
      z = vertices.getZ(i)
    const displacement = 1 + 0.16 * Math.sin(x * 8 + z * 5) * Math.cos(y * 7)
    vertices.setXYZ(i, x * displacement, y * displacement, z * displacement)
  }
  rockGeometry.computeVertexNormals()
  geometries.add(rockGeometry)
  const rockMaterial = new THREE.MeshLambertMaterial({
    color: '#ffffff',
    transparent: true,
    flatShading: false,
  })
  materials.add(rockMaterial)
  groundMaterial(rockMaterial)
  const rocks = new THREE.InstancedMesh(rockGeometry, rockMaterial, 38)
  rocks.frustumCulled = false
  group.add(rocks)
  const rockPlacements = Array.from({ length: 38 }, (_, i) => {
    const angle = i < 28 ? -1.75 + random() * 1.65 : -3 + random() * 0.8
    const origin = bank(angle, -0.02 + random() * 0.13)
    const size = i % 5 === 0 ? 1.6 + random() * 1.1 : 0.3 + random() * 0.95
    origin.y -= size * 0.12
    rocks.setColorAt(
      i,
      new THREE.Color().setHSL(0.08 + random() * 0.025, 0.12, 0.38 + random() * 0.15),
    )
    return {
      origin,
      scale: new THREE.Vector3(size * 1.5, size * 0.7, size),
      rotation: random() * 6.28,
    }
  })

  const leaf = new THREE.BufferGeometry()
  leaf.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      [
        -0.1, 0, 0, 0.1, 0, 0, -0.13, 0.7, 0.08, 0.13, 0.7, 0.08, -0.07, 1.3, 0.3, 0.07, 1.3, 0.3,
        0, 1.7, 0.65,
      ],
      3,
    ),
  )
  leaf.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6])
  leaf.computeVertexNormals()
  geometries.add(leaf)
  const foliageMaterial = new THREE.MeshLambertMaterial({
    color: '#ffffff',
    side: THREE.DoubleSide,
    transparent: true,
  })
  materials.add(foliageMaterial)
  foliageMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.oasisWind = wind
    shader.uniforms.oasisWindStrength = windStrength
    shader.vertexShader =
      'uniform float oasisWind; uniform float oasisWindStrength;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
      float reedPhase = instanceMatrix[3].x * .8;
      float reedBreeze = sin(oasisWind + reedPhase);
      float reedGust = sin(oasisWind*2.1 + reedPhase);
      transformed.x += (reedBreeze + reedGust*oasisWindStrength*.4 + oasisWindStrength*.7) * position.y * position.y * mix(.02,.12,oasisWindStrength);`,
      )
  }
  groundMaterial(foliageMaterial)
  const foliage = new THREE.InstancedMesh(leaf, foliageMaterial, 640)
  foliage.frustumCulled = false
  group.add(foliage)
  const tufts = Array.from({ length: 32 }, (_, i) =>
    bank(i < 26 ? -1.8 + random() * 1.8 : -3 + random() * 0.6, random() * 0.12),
  )
  const leafPlacements = Array.from({ length: 640 }, (_, i) => {
    const origin = tufts[Math.floor(i / 20)]!.clone()
    origin.x += (random() - 0.5) * 0.8
    origin.z += (random() - 0.5) * 0.8
    origin.y = ground(origin.x, origin.z) - 0.08
    const size = 0.55 + random() * 1.0
    foliage.setColorAt(
      i,
      new THREE.Color().setHSL(0.19 + random() * 0.07, 0.38, 0.32 + random() * 0.18),
    )
    return { origin, scale: new THREE.Vector3(size, size, size), rotation: random() * 6.28 }
  })
  const transform = new THREE.Object3D()
  function updateInstances(
    mesh: THREE.InstancedMesh,
    placements: typeof leafPlacements,
    expansion: number,
  ) {
    placements.forEach((item, i) => {
      transform.position.set(
        7 + (item.origin.x - 7) * expansion,
        item.origin.y,
        -44 + (item.origin.z + 44) * expansion,
      )
      transform.scale.copy(item.scale)
      transform.rotation.y = item.rotation
      transform.updateMatrix()
      mesh.setMatrixAt(i, transform.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }
  function setProgress(value: number, force = false) {
    if (value === progress && !force) return
    progress = value
    expansionUniform.value = 0
    waterLevel.value = -1 + floodHeight(progress)
    const storm = stormStrength(progress)
    fill.intensity = THREE.MathUtils.lerp(2.1, 1.25, storm)
    fill.color.set('#f4dfb1').lerp(new THREE.Color('#c3d1ce'), storm)
    fill.groundColor.set('#46644c').lerp(new THREE.Color('#666c62'), storm)
    sun.intensity = THREE.MathUtils.lerp(2.4, 0.35, storm)
    const opacity =
      THREE.MathUtils.smoothstep(progress, 0.24, 0.43) *
      // Finish the dissolve during inundation, before open-ocean troughs can
      // expose lingering crowns. Reverse scrolling restores the same shoreline.
      (1 - THREE.MathUtils.smoothstep(progress, 1.82, 1.99))
    group.visible = opacity > 0.001
    if (!group.visible) return
    materials.forEach((material) => {
      material.opacity = opacity
    })
    const expansion = 1
    updateInstances(rocks, rockPlacements, expansion)
    updateInstances(foliage, leafPlacements, expansion)
    const palmsVisible = camera.position.distanceTo(groveCenter) < 140
    palmInstances.forEach((mesh) => (mesh.visible = palmsVisible))
  }

  // Curated low-poly silhouettes sit on the dry bank, not on the water. The
  // arch is a distant focal point to the right; uneven buttes hide its straight
  // ends. Small, irregular plant clusters connect it to the existing grove.
  const desertReady = (async () => {
    const { loadDesertGeometry } = await import('./desert-geometry')
    if (disposed) return
    type Placement = { origin: THREE.Vector3; scale: THREE.Vector3; rotation: number }
    const dry = (x: number, z: number, height: number, width = 1, rotation = 0): Placement => ({
      origin: new THREE.Vector3(x, ground(x, z) - .18, z),
      scale: new THREE.Vector3(height * width, height, height), rotation,
    })
    const plants = (count: number, height: number, offset: number) =>
      Array.from({ length: count }, (_, i) => {
        const angle = -1.85 + ((i * .618 + offset) % 1) * 2.1
        const origin = bank(angle, .15 + random() * .19)
        return dry(origin.x, origin.z, height * (.65 + random() * .65), .85 + random() * .3, random() * 6.28)
      })
    const arch = dry(30, -98, 12, 1.15, -.12)
    const crown = (x: number, y: number, width: number, rotation: number): Placement => ({
      origin: new THREE.Vector3(x, arch.origin.y + y, -98),
      scale: new THREE.Vector3(width, 2.6, 3.2), rotation,
    })
    const assets = [
      { name: 'cliff_cave_rock', tint: '#ad8e74', placements: [arch] },
      { name: 'rock_largeA', tint: '#ad8e74',
        placements: [crown(27, 10.3, 4.2, .2), crown(32.5, 10.6, 3.9, -.35)] },
      { name: 'rock_tallA', tint: '#ad8e74',
        placements: [dry(23, -98, 8, 1, .3), dry(37, -98, 7, 1, 2.4), dry(-25, -65, 5, .9, .4)] },
      { name: 'rock_tallH', tint: '#a98c73',
        placements: [dry(43, -104, 10, .8, 1.5), dry(49, -109, 6, 1, 2), dry(-30, -78, 8, .85, 1)] },
      { name: 'cactus_tall', tint: '#53644a', placements: plants(9, 3.4, .1) },
      { name: 'cactus_short', tint: '#68734f', placements: plants(7, 1.9, .3) },
      { name: 'plant_bush', tint: '#697150', placements: plants(20, 1.3, .15) },
      { name: 'plant_bushSmall', tint: '#8a8054', placements: plants(16, .7, .21) },
    ]
    await Promise.all(assets.map(async (asset) => {
      try {
        const geometry = await loadDesertGeometry(asset.name)
        if (disposed) { geometry.dispose(); return }
        geometries.add(geometry)
        const material = new THREE.MeshLambertMaterial({
          color: '#ffffff', transparent: true, flatShading: true,
        })
        groundMaterial(material)
        materials.add(material)
        const mesh = new THREE.InstancedMesh(geometry, material, asset.placements.length)
        mesh.name = `desert-${asset.name}`
        accentMeshes.add(mesh)
        mesh.frustumCulled = false
        asset.placements.forEach((_, index) => {
          const color = new THREE.Color(asset.tint)
          color.multiplyScalar(.9 + (index % 4) * .055)
          mesh.setColorAt(index, color)
        })
        updateInstances(mesh, asset.placements, 1)
        group.add(mesh)
        setProgress(progress, true)
      } catch {
        // Optional dressing must never prevent the main world from rendering.
      }
    }))
  })().catch(() => {
    // A failed optional module download leaves the original grove intact.
  })

  // The world itself is lazy; prefetch its small palm asset immediately so the
  // grove is populated by the crest, rather than requesting it at the reveal.
  const palmsReady = (async () => {
    try {
      const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js')
      if (disposed) return
      const asset = await new GLTFLoader().loadAsync('/models/palm.glb')
      const tree = asset.scene
      tree.updateMatrixWorld(true)
      const parts: Record<'trunk' | 'foliage', THREE.BufferGeometry[]> = {
        trunk: [],
        foliage: [],
      }
      let leafMap: THREE.Texture | null = null
      tree.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return
        const originals = Array.isArray(object.material) ? object.material : [object.material]
        const foliage = originals.some(
          (original) => Boolean((original as THREE.MeshBasicMaterial).map),
        )
        const mapped = originals.find(
          (original) => Boolean((original as THREE.MeshBasicMaterial).map),
        ) as THREE.MeshBasicMaterial | undefined
        if (mapped?.map) {
          leafMap = mapped.map
          textures.add(mapped.map)
        }
        const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld)
        parts[foliage ? 'foliage' : 'trunk'].push(geometry)
        object.geometry.dispose()
        originals.forEach((original) => original.dispose())
      })
      palmPartCounts.trunk = parts.trunk.length
      palmPartCounts.foliage = parts.foliage.length
      for (const [kind, sourceParts] of Object.entries(parts) as [
        'trunk' | 'foliage',
        THREE.BufferGeometry[],
      ][]) {
        const value = kind === 'foliage' ? 1 : 0
        sourceParts.forEach((part) =>
          part.setAttribute(
            'aPalmFoliage',
            new THREE.Float32BufferAttribute(
              new Float32Array(part.getAttribute('position').count).fill(value),
              1,
            ),
          ),
        )
      }
      const sourceParts = [...parts.trunk, ...parts.foliage]
      if (!sourceParts.length || !leafMap) return
      const geometry = mergeGeometries(sourceParts, false)
      sourceParts.forEach((part) => part.dispose())
      if (!geometry) throw new Error('Could not merge complete palm geometry')
      geometries.add(geometry)
      geometry.computeBoundingBox()
      const bounds = geometry.boundingBox!
      const material = new THREE.MeshLambertMaterial({
        map: leafMap,
        color: '#ffffff',
        alphaTest: 0.42,
        alphaToCoverage: true,
        side: THREE.DoubleSide,
        transparent: true,
      })
      material.onBeforeCompile = (shader) => {
        shader.uniforms.palmTime = wind
        shader.uniforms.palmStorm = windStrength
        shader.uniforms.palmBounds = {
          value: new THREE.Vector2(bounds.min.y, Math.max(0.01, bounds.max.y - bounds.min.y)),
        }
        shader.uniforms.palmLeafTint = { value: new THREE.Color('#b5d57b') }
        shader.uniforms.palmTrunkTint = { value: new THREE.Color('#b18d62') }
        shader.vertexShader =
          'uniform float palmTime; uniform float palmStorm; uniform vec2 palmBounds; attribute float aPalmFoliage; varying float vPalmFoliage;\n' +
          shader.vertexShader.replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            vPalmFoliage=aPalmFoliage;
            float tip = clamp((position.y-palmBounds.x)/palmBounds.y,0.0,1.0);
            float phase = position.x*1.7+position.z*1.3;
            float breeze = sin(palmTime*.8+phase) + palmStorm*.45*sin(palmTime*2.3+phase);
            float flutter = sin(palmTime*1.7+phase*2.1) + palmStorm*.35*sin(palmTime*4.2+phase);
            float windResponse=mix(.15,1.0,aPalmFoliage);
            transformed.x += (breeze+flutter*.22)*tip*tip*palmBounds.y*mix(.0015,.018,palmStorm)*windResponse;
            transformed.z += flutter*tip*palmBounds.y*mix(.0008,.007,palmStorm)*windResponse;`,
          )
        shader.fragmentShader =
          'uniform vec3 palmLeafTint; uniform vec3 palmTrunkTint; varying float vPalmFoliage;\n' +
          shader.fragmentShader.replace(
            '#include <map_fragment>',
            `#ifdef USE_MAP
              vec4 palmLeaf=texture2D(map,vMapUv);
              vec4 palmSurface=mix(vec4(palmTrunkTint,1.0),vec4(palmLeaf.rgb*palmLeafTint,palmLeaf.a),vPalmFoliage);
              diffuseColor*=palmSurface;
            #endif`,
          )
      }
      material.customProgramCacheKey = () => 'oasis-palm-complete-v1'
      materials.add(material)
      groundMaterial(material)
      const mesh = new THREE.InstancedMesh(geometry, material, 9)
      mesh.name = 'oasis-palms-complete'
      mesh.frustumCulled = false
      palmInstances.push(mesh)
      group.add(mesh)
      for (const [i, angle] of [
        -1.65, -1.43, -1.25, -1.1, -0.92, -0.75, -0.52, -2.55, -2.72,
      ].entries()) {
        const origin = bank(angle, 0.035 + (i % 3) * 0.035)
        palmPlacements.push({
          origin,
          scale: [1.35, 1.8, 1.15, 1.65, 1.3, 1.7, 1.0, 1.05, 0.8][i]!,
          rotation: i * 2.4,
        })
      }
      if (disposed) dispose()
      else setProgress(progress, true)
    } catch {
      /* Rocks, reeds, and the irregular shoreline remain if the optional asset fails. */
    }
  })()

  function dispose() {
    disposed = true
    scene.remove(group)
    geometries.forEach((resource) => resource.dispose())
    materials.forEach((resource) => resource.dispose())
    textures.forEach((resource) => resource.dispose())
    accentMeshes.forEach((mesh) => mesh.dispose())
    palmInstances.forEach((mesh) => mesh.dispose())
    group.clear()
  }
  setProgress(0)
  return {
    // The renderer waits for the optional silhouettes before compiling the
    // foreground once. Otherwise their first visible oasis frame can force a
    // synchronous driver compile and produce a several-hundred-ms hitch.
    ready: Promise.all([desertReady, palmsReady]).then(() => undefined),
    getPalmPartCounts: () => ({ ...palmPartCounts }),
    setProgress,
    setTime: (seconds: number) => {
      wind.value = seconds
      const dt = lastWindTime === undefined ? 0 : Math.max(0, Math.min(.1, seconds-lastWindTime))
      lastWindTime = seconds
      // Scroll changes wind intensity, never its phase. Ease intensity too, so
      // quick navigation cannot snap the canopy into a different wind pose.
      windStrength.value += (stormStrength(progress)-windStrength.value)*(1-Math.exp(-dt*3))
      if (!group.visible) return
      palmPlacements.forEach(({ origin, scale, rotation }, index) => {
        const strength = windStrength.value
        const gust = Math.sin(seconds * .65 + origin.x * .055)
        const sway = Math.sin(seconds * .55 + index * .7) + strength * .3 * Math.sin(seconds * .95 + index * .7)
        // Rotate about the grounded asset origin; no translation or sinking.
        transform.position.copy(origin)
        transform.scale.setScalar(scale)
        transform.rotation.set(
          Math.sin(seconds * .47 + index) * (.001 + strength * .014),
          rotation,
          sway * (.0015 + strength * .032) - strength * (.022 + gust * .009),
        )
        transform.updateMatrix()
        palmInstances.forEach((mesh) => mesh.setMatrixAt(index, transform.matrix))
      })
      palmInstances.forEach((mesh) => (mesh.instanceMatrix.needsUpdate = true))
    },
    dispose,
  }
}
