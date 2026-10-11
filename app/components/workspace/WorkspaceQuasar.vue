<script setup lang="ts">
import { createWorkspaceQuasar } from '~/lib/scene/workspace-quasar'

const canvas = ref<HTMLCanvasElement | null>(null)
let disposeScene: (() => void) | undefined

onMounted(() => {
  if (!canvas.value) return
  try {
    disposeScene = createWorkspaceQuasar(canvas.value)
  } catch {
    // Keep the dashboard usable when a browser refuses WebGL.
    canvas.value.hidden = true
  }
})

onBeforeUnmount(() => disposeScene?.())
</script>

<template>
  <div class="workspace-quasar" aria-hidden="true">
    <canvas ref="canvas" class="workspace-quasar__canvas" />
  </div>
</template>

<style scoped>
.workspace-quasar {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  opacity: 0.48;
  isolation: isolate;
}

.workspace-quasar__canvas {
  display: block;
  width: 100%;
  height: 100%;
}

@media (max-width: 720px) {
  .workspace-quasar {
    opacity: 0.34;
  }
}

@media (prefers-reduced-motion: reduce) {
  .workspace-quasar {
  opacity: 0.4;
  }
}
</style>
