import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

// Bake each curated asset into one texture-free geometry for instancing.
// Keep the authored facets, but replace the pack's metallic palette with the
// same diffuse, fogged lighting used by the existing oasis.
export async function loadDesertGeometry(name: string) {
  const asset = await new GLTFLoader().loadAsync(`/models/desert/${name}.glb`)
  const parts: THREE.BufferGeometry[] = []
  const originals = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  asset.scene.updateMatrixWorld(true)
  asset.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    originals.add(object.geometry)
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      materials.add(material)
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) textures.add(value)
    }
    const geometry = object.geometry.index
      ? object.geometry.toNonIndexed()
      : object.geometry.clone()
    geometry.applyMatrix4(object.matrixWorld)
    for (const attribute of Object.keys(geometry.attributes))
      if (attribute !== 'position' && attribute !== 'normal') geometry.deleteAttribute(attribute)
    if (!geometry.hasAttribute('normal')) geometry.computeVertexNormals()
    parts.push(geometry)
  })
  const geometry = mergeGeometries(parts)
  parts.forEach((part) => part.dispose())
  originals.forEach((resource) => resource.dispose())
  materials.forEach((resource) => resource.dispose())
  textures.forEach((resource) => resource.dispose())
  if (!geometry) throw new Error(`Empty desert asset: ${name}`)
  geometry.computeBoundingBox()
  const bounds = geometry.boundingBox!
  const center = bounds.getCenter(new THREE.Vector3())
  const height = Math.max(0.01, bounds.max.y - bounds.min.y)
  geometry.translate(-center.x, -bounds.min.y, -center.z)
  geometry.scale(1 / height, 1 / height, 1 / height)
  geometry.computeBoundingBox()
  return geometry
}
