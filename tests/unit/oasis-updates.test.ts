import { describe, expect, it } from 'vitest'
import * as THREE from 'three'
import { createOasisDressing } from '../../app/lib/scene/oasis'

describe('oasis scroll updates', () => {
  it('evaluates cutout coverage before discarding buried fragments', () => {
    const scene = new THREE.Scene()
    const dressing = createOasisDressing(scene, new THREE.PerspectiveCamera(), true)
    try {
      scene.traverse((object) => {
        if (!(object instanceof THREE.InstancedMesh) || ![38, 640].includes(object.count)) return
        const material = object.material as THREE.Material
        const shader = {
          vertexShader: THREE.ShaderLib.lambert.vertexShader,
          fragmentShader: THREE.ShaderLib.lambert.fragmentShader,
          uniforms: {},
        }
        material.onBeforeCompile(shader as Parameters<THREE.Material['onBeforeCompile']>[0], {} as THREE.WebGLRenderer)
        expect(shader.fragmentShader.indexOf('fwidth(diffuseColor.a)')).toBeLessThan(shader.fragmentShader.indexOf('if (oasisWorld.y'))
      })
    } finally {
      dressing.dispose()
    }
  })
  it('keeps static rock/reed transforms and buffers unchanged during reversible scrolling', () => {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera()
    const dressing = createOasisDressing(scene, camera, true)
    try {
      dressing.setProgress(0.8)
      const meshes: THREE.InstancedMesh[] = []
      scene.traverse((object) => {
        if (object instanceof THREE.InstancedMesh && [38, 640].includes(object.count))
          meshes.push(object)
      })
      expect(meshes).toHaveLength(2)
      meshes.forEach((mesh) => {
        const material = mesh.material as THREE.Material
        expect(material.alphaHash).toBe(false)
        expect(material.alphaToCoverage).toBe(false)
        expect(material.transparent).toBe(true)
      })
      const snapshots = meshes.map((mesh) => ({
        version: mesh.instanceMatrix.version,
        array: mesh.instanceMatrix.array.slice(),
      }))
      for (const progress of [0.81, 0.9, 1.2, 1.8, 2.1, 1.2, 0.8]) dressing.setProgress(progress)
      meshes.forEach((mesh, index) => {
        expect(mesh.instanceMatrix.array).toEqual(snapshots[index]!.array)
        expect(mesh.instanceMatrix.version).toBe(snapshots[index]!.version)
      })
    } finally {
      dressing.dispose()
    }
  })
})
