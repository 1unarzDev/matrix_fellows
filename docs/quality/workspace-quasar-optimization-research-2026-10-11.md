# Workspace quasar optimization research — October 11, 2026

This is an implementation recommendation, not physical-device verification. The inspected renderer is `app/lib/scene/workspace-quasar.ts` at `fd1a265`. Its fragment shader performs nearly all animation in one full-screen pass. The baseline drawing-buffer resolution must remain unchanged for this performance work.

## Confirmed cost centers

The shader has 29 FBM call sites. Each FBM evaluates four octaves, with four hash calls per octave. The 24-iteration radial-filament loop evaluates two FBM fields per iteration: 768 lattice hashes per fragment before other effects. Nine volumetric samples add 144 lattice hashes. Together those two loops account for 912 hash evaluations for every fragment, even where their visual contribution is zero. Multiple transcendental operations (`atan`, `sin`, `cos`, `exp`, `pow`) accompany these fields.

The shader is ALU intensive, not draw-call intensive: one plane and one material are already appropriate. Three.js confirms that ShaderMaterial exposes custom shader and uniform control; its loop unrolling is optional, and should be measured rather than assumed faster. [ShaderMaterial reference](https://threejs.org/docs/pages/ShaderMaterial.html)

## First changes, without changing the field

1. Skip the entire filament loop outside its mathematically supported radius. Its final envelopes are zero outside approximately `0.82 < radius < 1.62`. Skip each angular filament when its angular Gaussian is below a carefully measured epsilon; this permits evaluating its FBM only where that puff has visible support. Preserve the original field inside support.
2. Skip the nine volume samples where the shell/falloff envelope contributes zero or below a separately documented epsilon. Most screen pixels lie far outside the disk thickness. Such branches should use broad coherent screen regions rather than alternating pixel-scale conditions.
3. Replace `pow(x, 2.0)` with `x * x`, and integer powers of nonnegative values with explicit products. Preserve fractional powers and all signs. CPU/vertex-calculated constant rotation values remove repeated uniform trigonometry with no change to motion.
4. Keep the fragment output resolution, alpha, final tone mapping, render order, field coordinates, and effect amplitudes unchanged during comparison. Do not present upscaled low-resolution animation as preserved resolution.
5. Remove the deliberate 30 FPS throttle after measured frame cost permits it. Advance elapsed time from actual consecutive timestamps; the old 50ms clamp can slow animation during poor frame rate.

## Exact lattice cache candidate

A once-rendered 512×512 RGBA32F lattice, at integer coordinates `[-256, 255]`, can store the original GPU `hash21` output in four channels for the four cell corners. Use nearest sampling (or `texelFetch`) and retain the original smooth interpolation. This replaces four hashes per noise evaluation with one texture lookup while retaining the same animated coordinates, four octaves, and field. It adds 4 MiB of GPU storage.

This is a candidate to benchmark, not a guaranteed win. The shader changes from ALU work to texture work, and distant octaves may have poor locality. MDN explicitly notes that smaller texture images have better fetch locality, and mipmaps are unnecessary for 2D resources never viewed zoomed out. [WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)

Use an RGBA32F render target only when `EXT_color_buffer_float` is present. That extension makes RGBA32F color-renderable in WebGL2. [Extension reference](https://developer.mozilla.org/en-US/docs/Web/API/EXT_color_buffer_float). Float renderability is not universal, so retain procedural fallback. Bake using the same GPU precision and hash operations, not JavaScript number arithmetic; CPU-double calculations can select different `fract` values. Preserve procedural fallback for coordinates outside the cached square, and do not wrap them modulo the cache size: that changes the field. Do not use half-float when claiming exact cache equivalence. Declare a highp sampler and no color-space conversion, and fetch exact texel centers. Each texel stores hashes for its base cell and three corners, including corner coordinates at 256 on the positive border. Sampling checks must use the base cell coordinates, not clamp them.

For Three.js render targets disable depth/stencil, mipmaps, and multisampling for this one-time table. [RenderTarget reference](https://threejs.org/docs/pages/RenderTarget.html). Dispose the table on renderer teardown and recreate it after context restoration. Avoid GPU readback, `getParameter`, `getError`, or `checkFramebufferStatus` inside the frame loop: MDN documents these as potential synchronous stalls. One-time capability checks at initialization are appropriate.

RGBA32F is more portable than assuming R32F in all Three.js paths, but R32F could reduce storage if only one hash value is stored and four `texelFetch` calls are measured better. The four-corner RGBA packing is the stronger initial candidate because it reduces fetch count.

## Context and GPU selection

Call `renderer.compileAsync(scene, camera)` before first rendering instead of forcing initial shader compilation during an interactive frame. Three.js recommends this asynchronous method because it uses `KHR_parallel_shader_compile` when available. This improves startup responsiveness; it does not reduce steady-state GPU shader cost. [WebGLRenderer reference](https://threejs.org/docs/pages/WebGLRenderer.html#compileAsync)

Three.js passes `powerPreference` to the WebGL context as a hint, and defaults depth to true. A decorative full-screen pass can request `depth: false`; the existing material already disables depth testing/writes. `powerPreference: 'high-performance'` may select a discrete GPU on some systems but is not a performance guarantee, and does not solve inefficient shader work. [WebGLRenderer source](https://github.com/mrdoob/three.js/blob/dev/src/renderers/WebGLRenderer.js)

The available Chromium in this environment returned Mesa llvmpipe for ANGLE GL/GLES, and SwiftShader for Vulkan/native and EGL alternatives. Tested `--use-angle=gl`, `--use-angle=gles`, `--use-gl=egl`, `--use-angle=vulkan --enable-features=Vulkan --use-vulkan=native`, `--use-gl=desktop`, and `--use-angle=gl-egl`, including the NVIDIA GLX vendor hint. No physical GPU renderer was obtained. Treat timings here as controlled software-renderer comparisons, not evidence that most real devices meet 60 FPS.

## Verification required

Compare deterministic screenshots from the same time, aspect ratio, pixel ratio, and canvas dimensions. Inspect absolute pixel differences and zoomed crops around the horizon, filament edges, disk volume, and jets. Measure synchronized GPU/frame cost over warmed runs and record the actual renderer string. A browser RAF count without GPU synchronization or timer-query results may only measure submission cadence. Do not add synchronous measurement calls to shipped animation code. Follow with physical-device testing (integrated desktop GPU and at least one mobile device) before claiming high frame rate on most devices.
