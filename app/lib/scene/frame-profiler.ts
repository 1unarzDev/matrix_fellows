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
  updateMs: number
  rawInterval: number | null
  requestedProgress: number
  requestAgeMs: number | null
  progressLag: number
  targetFps: number
  bufferWidth: number
  bufferHeight: number
  atmosphereWidth: number
  atmosphereHeight: number
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
  callbacks: { time: number; interval: number | null }[]
}

declare global {
  interface Window {
    __MATRIX_PROFILE__?: boolean
    __matrixWorldProfile?: WorldProfile
    __matrixWorldDebug?: {
      setProgress(value: number): void
      setQuality(patch: Partial<QualityState>): void
      freeze(progress: number, seconds: number): void
      resume(): void
      pauseDrawing(paused: boolean): void
      useGeneralShader(enabled: boolean): void
      useGeneralComposite(enabled: boolean): void
      useLegacyComposerSwap(enabled: boolean): void
      useLegacyBloomDepth(enabled: boolean): void
      snapshot(): Record<string, any>
    }
  }
}

export interface FrameProfiler {
  enabled: boolean
  gpuCost(): number | null
  callback(now: number): void
  pause(): void
  begin(now: number): void
  end(
    now: number,
    cpuMs: number,
    info: THREE.WebGLInfo,
    quality: QualityState,
    progress: number,
    timing: Pick<
      ProfileFrame,
      | 'updateMs'
      | 'rawInterval'
      | 'requestedProgress'
      | 'requestAgeMs'
      | 'targetFps'
      | 'bufferWidth'
      | 'bufferHeight'
      | 'atmosphereWidth'
      | 'atmosphereHeight'
    >,
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
  const profile: WorldProfile = {
    startedAt: performance.now(),
    renderer: rendererName,
    gpuTiming: 'unavailable',
    rejectedGpuSamples: 0,
    frames: [],
    events: [],
    callbacks: [],
  }
  if (enabled) window.__matrixWorldProfile = profile

  const gl2 = gl instanceof WebGL2RenderingContext ? gl : undefined
  const timer = gl2?.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension | null
  if (timer) profile.gpuTiming = 'pending'
  const pending: PendingQuery[] = []
  let active: WebGLQuery | undefined
  let nextId = 0
  let previousTime: number | undefined
  let previousCallback: number | undefined
  let latestGpuMs: number | null = null
  let lastQueryAt = -500

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
      latestGpuMs = item.frame.gpuMs
      gl2.deleteQuery(item.query)
      pending.shift()
      profile.gpuTiming = 'available'
    }
  }

  return {
    enabled,
    gpuCost: () => latestGpuMs,
    pause() {
      previousTime = undefined
      previousCallback = undefined
    },
    callback(now) {
      if (!enabled) return
      profile.callbacks.push({
        time: now - profile.startedAt,
        interval: previousCallback === undefined ? null : now - previousCallback,
      })
      previousCallback = now
      if (profile.callbacks.length > 18000) profile.callbacks.splice(0, 3000)
    },
    begin(now) {
      collect()
      if (!gl2 || !timer || pending.length >= 8) return
      if (!enabled && now - lastQueryAt < 500) return
      lastQueryAt = now
      active = gl2.createQuery() || undefined
      if (active) gl2.beginQuery(timer.TIME_ELAPSED_EXT, active)
    },
    end(now, cpuMs, info, quality, progress, timing) {
      if (!enabled && !active) return
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
        ...timing,
        progressLag: Math.abs(timing.requestedProgress - progress),
      }
      previousTime = now
      if (enabled) profile.frames.push(frame)
      if (profile.frames.length > 18000) profile.frames.splice(0, 3000)
      if (active && gl2 && timer) {
        gl2.endQuery(timer.TIME_ELAPSED_EXT)
        pending.push({ query: active, frame })
        active = undefined
      }
      collect()
    },
    event(name, detail) {
      if (!enabled) return
      profile.events.push({ time: performance.now() - profile.startedAt, name, detail })
      if (profile.events.length > 500) profile.events.splice(0, 100)
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
