import type * as THREE from 'three'
import type { QualityState } from './render-quality'

interface TimerExtension {
  TIME_ELAPSED_EXT: number
  GPU_DISJOINT_EXT: number
}

interface PendingQuery {
  query: WebGLQuery
  frame: ProfileFrame
}

export interface ProfileFrame {
  id: number
  time: number
  interval: number | null
  cpuMs: number
  gpuMs: number | null
  calls: number
  triangles: number
  points: number
  qualityStep: number
  atmosphereRatio: number
  particleFraction: number
  progress: number
}

export interface ProfileEvent {
  time: number
  name: string
  detail?: Record<string, string | number | boolean>
}

export interface WorldProfile {
  startedAt: number
  renderer: string
  gpuTiming: 'pending' | 'available' | 'unavailable'
  rejectedGpuSamples: number
  frames: ProfileFrame[]
  events: ProfileEvent[]
}

declare global {
  interface Window {
    __MATRIX_PROFILE__?: boolean
    __matrixWorldProfile?: WorldProfile
  }
}

export interface FrameProfiler {
  begin(now: number): void
  end(
    now: number,
    cpuMs: number,
    info: THREE.WebGLInfo,
    quality: QualityState,
    progress: number,
  ): void
  event(name: string, detail?: ProfileEvent['detail']): void
  dispose(): void
}

export function createFrameProfiler(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  rendererName: string,
): FrameProfiler | undefined {
  const enabled =
    window.__MATRIX_PROFILE__ === true || new URLSearchParams(location.search).has('matrixProfile')
  if (!enabled) return

  const profile: WorldProfile = {
    startedAt: performance.now(),
    renderer: rendererName,
    gpuTiming: 'unavailable',
    rejectedGpuSamples: 0,
    frames: [],
    events: [],
  }
  window.__matrixWorldProfile = profile

  const gl2 = gl instanceof WebGL2RenderingContext ? gl : undefined
  const timer = gl2?.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension | null
  if (timer) profile.gpuTiming = 'pending'
  const pending: PendingQuery[] = []
  let active: WebGLQuery | undefined
  let nextId = 0
  let previousTime: number | undefined

  const collect = () => {
    if (!gl2 || !timer || !pending.length) return
    if (gl2.getParameter(timer.GPU_DISJOINT_EXT)) {
      profile.rejectedGpuSamples += pending.length
      pending.splice(0).forEach(({ query }) => gl2.deleteQuery(query))
      return
    }
    while (pending.length) {
      const item = pending[0]!
      if (!gl2.getQueryParameter(item.query, gl2.QUERY_RESULT_AVAILABLE)) break
      item.frame.gpuMs = gl2.getQueryParameter(item.query, gl2.QUERY_RESULT) / 1_000_000
      gl2.deleteQuery(item.query)
      pending.shift()
      profile.gpuTiming = 'available'
    }
  }

  return {
    begin() {
      collect()
      if (!gl2 || !timer || pending.length >= 8) return
      active = gl2.createQuery() || undefined
      if (active) gl2.beginQuery(timer.TIME_ELAPSED_EXT, active)
    },
    end(now, cpuMs, info, quality, progress) {
      const frame: ProfileFrame = {
        id: nextId++,
        time: now - profile.startedAt,
        interval: previousTime === undefined ? null : now - previousTime,
        cpuMs,
        gpuMs: null,
        calls: info.render.calls,
        triangles: info.render.triangles,
        points: info.render.points,
        qualityStep: quality.step,
        atmosphereRatio: quality.atmosphereRatio,
        particleFraction: quality.particleFraction,
        progress,
      }
      previousTime = now
      profile.frames.push(frame)
      if (active && gl2 && timer) {
        gl2.endQuery(timer.TIME_ELAPSED_EXT)
        pending.push({ query: active, frame })
        active = undefined
      }
      collect()
    },
    event(name, detail) {
      profile.events.push({ time: performance.now() - profile.startedAt, name, detail })
    },
    dispose() {
      if (active && gl2 && timer) {
        gl2.endQuery(timer.TIME_ELAPSED_EXT)
        gl2.deleteQuery(active)
      }
      pending.splice(0).forEach(({ query }) => gl2?.deleteQuery(query))
    },
  }
}
