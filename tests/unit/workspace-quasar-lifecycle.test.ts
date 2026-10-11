import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const renderers: Array<{
  render: ReturnType<typeof vi.fn>
  setPixelRatio: ReturnType<typeof vi.fn>
  setSize: ReturnType<typeof vi.fn>
  getDrawingBufferSize: (target: { set: (x: number, y: number) => void }) => void
  dispose: ReturnType<typeof vi.fn>
}> = []

vi.mock('three', () => {
  class Vector2 {
    x = 1
    y = 1
    set(x: number, y: number) {
      this.x = x
      this.y = y
    }
  }
  class WebGLRenderer {
    render = vi.fn()
    setPixelRatio = vi.fn()
    setSize = vi.fn()
    getDrawingBufferSize = (target: Vector2) => target.set(640, 360)
    dispose = vi.fn()
    constructor() {
      renderers.push(this as unknown as (typeof renderers)[number])
    }
    setClearColor() {}
  }
  class Scene {
    add() {}
  }
  class Camera {}
  class ShaderMaterial {
    dispose = vi.fn()
    constructor() {}
  }
  class PlaneGeometry {
    dispose = vi.fn()
    constructor() {}
  }
  class Mesh {
    constructor() {}
  }
  return { Vector2, WebGLRenderer, Scene, Camera, ShaderMaterial, PlaneGeometry, Mesh }
})

type ListenerMap = Record<string, (event: Event) => void>

describe('workspace quasar lifecycle', () => {
  let rafCallbacks: FrameRequestCallback[]
  let cancelled: number[]
  let resizeCallback: () => void
  let intersectionCallback: (entries: Array<{ isIntersecting: boolean; intersectionRatio: number }>) => void
  let visibilityCallback: () => void
  let reducedChangeCallback: () => void
  let reducedQuery: { matches: boolean }
  let listeners: ListenerMap
  let canvas: HTMLCanvasElement & { clientWidth: number; clientHeight: number }

  beforeEach(() => {
    renderers.length = 0
    rafCallbacks = []
    cancelled = []
    listeners = {}
    canvas = {
      clientWidth: 640,
      clientHeight: 360,
      addEventListener: ((type: string, callback: EventListenerOrEventListenerObject) => {
        listeners[type] = callback as (event: Event) => void
      }) as HTMLCanvasElement['addEventListener'],
      removeEventListener: ((type: string) => {
        delete listeners[type]
      }) as HTMLCanvasElement['removeEventListener'],
    } as unknown as HTMLCanvasElement & { clientWidth: number; clientHeight: number }

    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      rafCallbacks.push(callback)
      return rafCallbacks.length
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      cancelled.push(id)
    })
    vi.stubGlobal('window', { devicePixelRatio: 1 })
    reducedQuery = { matches: false }
    vi.stubGlobal('matchMedia', () => ({
      get matches() {
        return reducedQuery.matches
      },
      addEventListener: (_type: string, callback: () => void) => {
        reducedChangeCallback = callback
      },
      removeEventListener: vi.fn(),
    }))
    vi.stubGlobal('document', {
      hidden: false,
      addEventListener: (type: string, callback: () => void) => {
        if (type === 'visibilitychange') visibilityCallback = callback
      },
      removeEventListener: vi.fn(),
    })
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = () => callback([], this as unknown as ResizeObserver)
      }
      observe() {}
      disconnect() {}
    })
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: IntersectionObserverCallback) {
        intersectionCallback = (entries) => callback(entries as IntersectionObserverEntry[], this as unknown as IntersectionObserver)
      }
      observe() {}
      disconnect() {}
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('skips duplicate resize work while preserving the effective pixel ratio', async () => {
    const { createWorkspaceQuasar } = await import('../../app/lib/scene/workspace-quasar')
    const dispose = createWorkspaceQuasar(canvas)
    const renderer = renderers[0]

    expect(renderer.setPixelRatio).toHaveBeenCalledWith(0.72)
    expect(renderer.render).toHaveBeenCalledTimes(1)
    resizeCallback()
    expect(renderer.setSize).toHaveBeenCalledTimes(1)
    expect(renderer.render).toHaveBeenCalledTimes(1)

    canvas.clientWidth = 700
    resizeCallback()
    expect(renderer.setSize).toHaveBeenCalledTimes(2)
    expect(renderer.render).toHaveBeenCalledTimes(2)
    dispose()
  })

  it('pauses offscreen and recovers from a lost WebGL context', async () => {
    const { createWorkspaceQuasar } = await import('../../app/lib/scene/workspace-quasar')
    const dispose = createWorkspaceQuasar(canvas)
    const renderer = renderers[0]
    const preventDefault = vi.fn()

    expect(rafCallbacks).toHaveLength(1)
    intersectionCallback([{ isIntersecting: false, intersectionRatio: 0 }])
    expect(cancelled).toHaveLength(1)

    intersectionCallback([{ isIntersecting: true, intersectionRatio: 1 }])
    expect(rafCallbacks).toHaveLength(2)

    listeners.webglcontextlost?.({ preventDefault } as unknown as Event)
    expect(preventDefault).toHaveBeenCalledOnce()
    expect(cancelled).toHaveLength(2)

    const rendersBeforeRestore = renderer.render.mock.calls.length
    listeners.webglcontextrestored?.(new Event('webglcontextrestored'))
    expect(renderer.render.mock.calls.length).toBeGreaterThan(rendersBeforeRestore)
    expect(rafCallbacks).toHaveLength(3)
    dispose()
  })

  it('does not schedule work while hidden or in reduced-motion mode', async () => {
    const { createWorkspaceQuasar } = await import('../../app/lib/scene/workspace-quasar')
    const dispose = createWorkspaceQuasar(canvas)
    const renderer = renderers[0]
    const documentStub = document as unknown as { hidden: boolean }

    documentStub.hidden = true
    visibilityCallback()
    expect(cancelled).toHaveLength(1)
    const rendersBeforeHiddenFrame = renderer.render.mock.calls.length
    rafCallbacks[0]?.(100)
    expect(renderer.render.mock.calls.length).toBe(rendersBeforeHiddenFrame)

    documentStub.hidden = false
    visibilityCallback()
    expect(rafCallbacks).toHaveLength(2)
    reducedQuery.matches = true
    reducedChangeCallback()
    expect(cancelled).toHaveLength(2)
    const reducedFrame = rafCallbacks[2]
    reducedFrame?.(200)
    expect(renderer.render.mock.calls.length).toBeGreaterThan(rendersBeforeHiddenFrame)
    expect(rafCallbacks).toHaveLength(3)
    dispose()
    dispose()
    expect(renderer.dispose).toHaveBeenCalledOnce()
  })
})
