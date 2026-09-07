// One-time asset conversion. Requires the local dev server and Playwright Chromium.
import { chromium } from '@playwright/test'
import { writeFile } from 'node:fs/promises'
const browser = await chromium.launch({ args: ['--no-sandbox'] })
try {
  const page = await browser.newPage()
  await page.goto('http://localhost:3000')
  const result = await page.evaluate(async (root) => {
    const base = '/_nuxt/@fs' + root + '/node_modules/three/'
    const THREE = await import(base + 'build/three.module.js')
    const { FBXLoader } = await import(base + 'examples/jsm/loaders/FBXLoader.js')
    const { GLTFExporter } = await import(base + 'examples/jsm/exporters/GLTFExporter.js')
    const manager = new THREE.LoadingManager()
    manager.setURLModifier((url) =>
      /Leaves/i.test(url)
        ? '/models/palm-leaves.png'
        : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
    )
    const fbx = await (await fetch('/models/palm-source.fbx')).arrayBuffer()
    const model = new FBXLoader(manager).parse(fbx, '')
    const leafTexture = await new THREE.TextureLoader().loadAsync('/models/palm-leaves.png')
    model.traverse((object) => {
      if (!object.isMesh) return
      // The source's Godot prefab explicitly resets this FBX child rotation.
      object.rotation.set(0, 0, 0)
      const replace = (material) =>
        new THREE.MeshBasicMaterial({
          name: material.name,
          color: '#fff',
          map: /Leaves/i.test(material.name) ? leafTexture : null,
          alphaTest: 0.45,
          side: THREE.DoubleSide,
        })
      object.material = Array.isArray(object.material)
        ? object.material.map(replace)
        : replace(object.material)
    })
    model.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(model),
      size = box.getSize(new THREE.Vector3())
    model.scale.multiplyScalar(7 / size.y)
    model.updateMatrixWorld(true)
    const normalizedBox = new THREE.Box3().setFromObject(model)
    model.position.y -= normalizedBox.min.y
    const binary = await new GLTFExporter().parseAsync(model, { binary: true })
    return { bytes: Array.from(new Uint8Array(binary)), size: size.toArray() }
  }, process.cwd())
  await writeFile('public/models/palm.glb', new Uint8Array(result.bytes))
  console.log(`Prepared ${result.bytes.length} byte palm; source bounds ${result.size.join(', ')}`)
} finally {
  await browser.close()
}
