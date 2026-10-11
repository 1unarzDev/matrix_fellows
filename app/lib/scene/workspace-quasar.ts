import * as THREE from 'three'

/**
 * A lightweight, full-screen quasar illustration for the workspace shell.
 *
 * It is intentionally a single fragment pass: the accretion flow, lensing,
 * jets, and star field share the same clock, so the motion feels like one
 * physical system instead of a collection of unrelated CSS layers.
 */
export function createWorkspaceQuasar(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    depth: false,
    powerPreference: 'low-power',
  })
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()
  const camera = new THREE.Camera()
  const uniforms = {
    uResolution: { value: new THREE.Vector2(1, 1) },
    uTime: { value: 0 },
  }
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    vertexShader: /* glsl */ `
      void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      // Keep high precision where the device exposes it. On constrained
      // fragment units, mediump avoids a shader-link failure and is enough
      // for this soft, heavily composited backdrop at the existing buffer
      // size.
      #ifdef GL_FRAGMENT_PRECISION_HIGH
      precision highp float;
      #else
      precision mediump float;
      #endif
      uniform vec2 uResolution;
      uniform float uTime;

      #define TAU 6.28318530718

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
          mix(hash21(i + vec2(0.0, 1.0)), hash21(i + 1.0), f.x),
          f.y
        );
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 4; i++) {
          value += amplitude * noise(p);
          p = mat2(1.6, -1.2, 1.2, 1.6) * p + 11.7;
          amplitude *= 0.5;
        }
        return value;
      }

      mat2 rotate(float angle) {
        float s = sin(angle), c = cos(angle);
        return mat2(c, -s, s, c);
      }

      vec3 heat(float radius) {
        vec3 inner = vec3(1.0, 0.96, 0.78);
        vec3 gold = vec3(1.0, 0.56, 0.16);
        vec3 violet = vec3(0.43, 0.20, 0.48);
        vec3 warm = mix(inner, gold, smoothstep(0.16, 0.72, radius));
        return mix(warm, violet, smoothstep(0.82, 1.45, radius));
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution;
        float aspect = uResolution.x / max(uResolution.y, 1.0);

        // Keep the object on the open side of the dashboard on wide screens.
        vec2 center = aspect > 1.0 ? vec2(0.68, 0.49) : vec2(0.52, 0.43);
        float scale = aspect > 1.0 ? 0.35 : 0.48;
        vec2 p = (uv - center) / scale;
        p.x *= aspect;
        p = rotate(-0.25) * p;

        float time = uTime;
        float screenRadius = length(p);
        vec3 color = vec3(0.0);
        float alpha = 0.0;

        // A restrained cloud gives the flow a soft, cinematic halo.
        float cloud = fbm(p * 2.2 + vec2(time * 0.018, -time * 0.012));
        float haze = exp(-screenRadius * screenRadius * 1.2) * (0.42 + cloud * 0.58);
        color += vec3(0.19, 0.055, 0.08) * haze;
        alpha += haze * 0.28;

        // Large-scale nebula color gives the quasar a warm atmospheric envelope
        // that fades continuously into space instead of stopping at the disk.
        float nebulaNoise = fbm(p * 0.72 + vec2(-time * 0.012, time * 0.009));
        float nebulaFalloff = exp(-screenRadius * screenRadius * 0.26);
        float nebulaCore = smoothstep(2.4, 0.08, screenRadius);
        vec3 nebulaColor = mix(vec3(0.24, 0.028, 0.13), vec3(0.62, 0.15, 0.07), smoothstep(1.55, 0.12, screenRadius));
        color += nebulaColor * nebulaFalloff * nebulaCore * (0.32 + nebulaNoise * 0.64);
        alpha += nebulaFalloff * nebulaCore * 0.26;

        // The detailed disk is localized. Outside this radius its remaining
        // exponential tails are below output precision; atmosphere, jets and
        // stars still render at the same resolution everywhere.
        float turbulent = 0.0;
        float shadow = 1.0 - smoothstep(0.19, 0.205, screenRadius);
        if (screenRadius < 2.6) {
        // Differential rotation: the inner material laps the outer material.
        vec2 disk = vec2(p.x, p.y / 0.24);
        float radius = length(disk);
        float angle = atan(disk.y, disk.x);
        float orbitalSpeed = 0.12 + 0.42 / (radius * radius + 0.22);
        float phase = angle - time * orbitalSpeed;
        // This tilted-disk band excludes the empty area above/below the flow.
        // Its remaining analytic glow at the boundary is < 1e-12.
        if (radius < 3.5) {
        turbulent = fbm(vec2(cos(phase) * 3.6 + radius * 5.5, sin(phase) * 3.6 - radius * 2.7));
        // Break the mathematically flat ellipse at its silhouette. The lift
        // varies around the orbit, so the near and far edges rise into uneven
        // folds instead of ending on one shared plane.
        float edgeNoise = fbm(vec2(cos(angle) * 4.6 + time * 0.075, sin(angle) * 4.6 - time * 0.052));
        float edgeLift = (edgeNoise - 0.5) * 0.17 * smoothstep(0.62, 1.34, radius);
        edgeLift += 0.032 * sin(angle * 7.0 - time * 0.38) * smoothstep(0.78, 1.3, radius);
        float roughRadius = length(vec2(p.x, (p.y - edgeLift) / 0.24));
        float edgeScale = 1.0 + (edgeNoise - 0.5) * 0.18 + 0.025 * sin(angle * 11.0 + time * 0.32);
        float profileRadius = roughRadius / edgeScale;
        // Use warped noise for the streaks instead of a regular radial sine.
        // This keeps the flow visibly turbulent and removes the clean nested
        // circles that made the disk feel like a flat illustration.
        float streakNoise = fbm(vec2(radius * 8.0 - phase * 1.8, phase * 2.2 + radius * 4.0));
        float wispNoise = noise(vec2(radius * 13.0 - phase * 3.2, phase * 2.8 + radius * 7.0));
        float wisps = pow(max(0.0, sin(radius * 24.0 - phase * 6.0 + turbulent * 8.0 + wispNoise * 3.0)), 3.0);
        float filament = 0.34 + 0.45 * streakNoise + 0.21 * wisps;
        float diskBody = (1.0 - smoothstep(1.08, 1.42, profileRadius)) * smoothstep(0.14, 0.46, profileRadius);
        float diskGlow = exp(-pow((radius - 0.94) * 2.2, 2.0));
        float beaming = 1.0 - 0.5 * p.x / sqrt(1.0 + p.x * p.x);
        float flow = diskBody * (0.28 + turbulent * 0.54 + filament * 0.28) * beaming;
        float depthShade = mix(0.58, 1.22, smoothstep(0.5, -0.58, p.y));
        color += heat(radius) * flow * 1.25 * depthShade;
        color += vec3(1.0, 0.48, 0.12) * diskGlow * (0.22 + filament * 0.44);
        // A soft outer sheath carries the disk past its resolved edge. This
        // removes the pinched cutoff on the receding side and echoes the broad
        // red-gold haze in the reference image.
        // Fade the resolved rim at the left/right tips so it does not become
        // one continuous hairline. Short radial puffs below supply the
        // individual strands in those directions instead.
        float horizontalFade = smoothstep(0.16, 0.48, abs(sin(angle)));
        float outerSheathNoise = noise(vec2(angle * 6.0 + time * 0.10, radius * 5.0));
        float outerSheath = exp(-pow((radius - 1.3) * 3.3, 2.0)) * (0.2 + turbulent * 0.65);
        color += heat(radius * 1.12) * outerSheath * 0.42;
        alpha += flow * 0.72 + diskGlow * 0.35 + outerSheath * 0.34;

        // Sparse rising/falling tongues add depth to the outside edge. Their
        // height and brightness change independently from the main disk flow.
        float tendrilBand = exp(-pow((profileRadius - 1.31) * 4.8, 2.0));
        float tendrilCut = 0.35 + 0.65 * pow(edgeNoise, 1.7);
        float tendrilPulse = 0.55 + 0.45 * sin(angle * 8.0 - time * 0.72 + edgeNoise * 7.0);
        float tendrils = tendrilBand * tendrilCut * (0.56 + 0.44 * max(tendrilPulse, 0.0));
        tendrils *= 0.32;
        color += mix(vec3(0.95, 0.36, 0.2), vec3(1.0, 0.7, 0.35), edgeNoise) * tendrils * 0.34;
        alpha += tendrils * 0.26;

        // Several short tongues break from the rim. Each has its own phase,
        // vertical lift, and noisy fade, so they bob through the disk instead
        // of forming one long contour line.
        float tongues = 0.0;
        for (int ti = 0; ti < 8; ti++) {
          float tf = float(ti);
          float tPhase = angle * (4.0 + tf * 0.22) - time * (0.42 + tf * 0.05) + tf * 1.73;
          float tLift = 0.055 * sin(tPhase * 1.7 + time * 0.32 + tf);
          float tRadius = 1.04 + tLift + 0.055 * sin(tPhase * 0.7 + edgeNoise * 4.0);
          float tBand = exp(-pow((radius - tRadius) * 7.5, 2.0));
          float tBreak = pow(max(0.0, sin(tPhase * 1.35 + edgeNoise * 5.0)), 7.0);
          tongues += tBand * tBreak * smoothstep(0.62, 0.84, radius) * (1.0 - smoothstep(1.34, 1.58, radius));
        }
        tongues *= 0.16 + 0.84 * edgeNoise;
        color += heat(radius * 1.08) * tongues * 0.18;
        alpha += tongues * 0.11;

        // Volumetric outer folds keep the silhouette from reading as a clean,
        // concentric ellipse. The radius of each smoky lobe wanders with a
        // slowly moving angular field, while sharper strands break through it
        // like ink tendrils lifting above and below the disk plane.
        float outerAngle = angle - time * 0.045;
        vec2 outerCoord = vec2(
          cos(outerAngle) * 3.1 + radius * 1.35,
          sin(outerAngle) * 3.1 - radius * 1.8
        );
        float outerField = fbm(outerCoord + vec2(time * 0.018, -time * 0.012));
        float outerFine = fbm(vec2(
          cos(outerAngle * 1.13) * 6.2 + radius * 2.6,
          sin(outerAngle * 1.13) * 6.2 - radius * 3.0
        ) - time * 0.025);
        float lobeRadius = 1.08 + (outerField - 0.5) * 0.24 + (outerFine - 0.5) * 0.12;
        float lobeEnvelope = exp(-pow((radius - lobeRadius) * 2.55, 2.0));
        float lobeFade = smoothstep(0.66, 0.94, radius) * (1.0 - smoothstep(1.46, 1.82, radius));
        float lobeCut = smoothstep(0.28, 0.72, outerField) * (0.52 + outerFine * 0.48);
        float smokeVolume = lobeEnvelope * lobeFade * (0.2 + 0.8 * lobeCut);
        vec3 smokeTint = mix(vec3(0.32, 0.07, 0.11), vec3(0.94, 0.31, 0.14), smoothstep(0.22, 0.8, outerField));
        color += smokeTint * smokeVolume * 0.26;
        alpha += smokeVolume * 0.2;

        // Short radial filaments replace the old continuous outer ring. Each
        // puff starts at the resolved rim, reaches only a little way outward,
        // and has its own angular width and animated drift. This keeps many
        // small strands visible in both horizontal directions without making
        // one long line run off into empty space.
        float filamentPuffs = 0.0;
        float filamentHot = 0.0;
        // Both masks below are exactly zero outside this band. Preserve every
        // filament, but avoid its expensive noise when it cannot contribute.
        if (radius > 0.82 && radius < 1.62) {
        for (int fi = 0; fi < 24; fi++) {
          float ff = float(fi);
          float fSeed = hash21(vec2(ff * 1.91 + 6.0, 17.4));
          float fSeed2 = hash21(vec2(ff * 2.37 + 2.0, 38.6));
          float fDrift = 0.10 * sin(time * (0.12 + fSeed * 0.05) + fSeed * TAU)
            + 0.045 * sin(time * 0.24 + fSeed2 * 9.0);
          float fAngle = TAU * (ff + fSeed * 0.62) / 24.0 + fDrift;
          float fDelta = atan(sin(angle - fAngle), cos(angle - fAngle));
          float fAngular = exp(-pow(fDelta / mix(0.045, 0.095, fSeed2), 2.0));
          // Below a millionth of full intensity this puff cannot affect an
          // 8-bit output pixel, even before the dashboard opacity treatment.
          if (fAngular < 0.000001) continue;
          float fNoise = fbm(vec2(cos(angle) * 4.0 + ff * 0.31 + time * 0.03,
            sin(angle) * 4.0 - ff * 0.27 - time * 0.022));
          float fBase = 1.10 + fSeed * 0.13 + 0.018 * sin(time * 0.4 + ff);
          float fReach = 0.085 + fSeed2 * 0.14;
          float fHead = fBase + fReach * (0.55 + 0.22 * fNoise);
          float fBody = smoothstep(fBase - 0.035, fBase + 0.028, radius)
            * (1.0 - smoothstep(fHead - 0.045, fHead + 0.055, radius));
          float fTip = exp(-pow((radius - fHead) / (0.045 + fSeed * 0.02), 2.0));
          float fBreak = 0.34 + 0.66 * fbm(vec2(radius * 9.0 + ff * 1.7 - time * 0.07,
            angle * 3.0 - ff * 0.54 + time * 0.04));
          float fPuff = fAngular * (fBody * 0.58 + fTip * 0.78) * fBreak;
          filamentPuffs += fPuff * (0.42 + 0.28 * fNoise);
          filamentHot += fPuff * (0.18 + 0.72 * fNoise);
        }
        }
        filamentPuffs *= smoothstep(0.82, 1.04, radius) * (1.0 - smoothstep(1.34, 1.62, radius));
        filamentHot *= smoothstep(0.88, 1.08, radius) * (1.0 - smoothstep(1.36, 1.60, radius));
        float filamentTint = 0.32 + 0.68 * fbm(vec2(angle * 2.8 + time * 0.04, radius * 5.0));
        color += mix(vec3(0.44, 0.07, 0.09), vec3(0.98, 0.42, 0.19), filamentTint) * filamentPuffs * 0.30;
        color += heat(radius * 1.08) * filamentHot * 0.10;
        alpha += filamentPuffs * 0.22 + filamentHot * 0.04;

        // A broad near-side veil adds the requested volume in front of the
        // horizon. Noise displaces its center and gives the lower fold a soft,
        // space-ink edge instead of another perfect circular line.
        float depthNoise = fbm(p * 2.7 + vec2(time * 0.06, -time * 0.045));
        float nearBias = smoothstep(-0.16, 0.72, -p.y);
        float nearRadius = 0.98 + (depthNoise - 0.5) * 0.18;
        float nearVeil = exp(-pow((radius - nearRadius) * 1.55, 2.0));
        nearVeil *= smoothstep(0.34, 0.62, radius) * (1.0 - smoothstep(1.24, 1.82, radius));
        nearVeil *= nearBias * (0.34 + 0.66 * depthNoise);
        float nearStrand = pow(max(0.0, sin(angle * 6.0 - time * 0.17 + depthNoise * 9.0)), 3.0);
        color += mix(vec3(0.48, 0.075, 0.08), vec3(0.95, 0.31, 0.13), depthNoise) * nearVeil * (0.25 + nearStrand * 0.14);
        alpha += nearVeil * 0.30;

        }

        // Lensed upper and lower arcs curl around the shadow.
        float ring = exp(-pow((screenRadius - 0.72) * 5.2, 2.0));
        float ringFlow = 0.38 + 0.62 * fbm(vec2(cos(angle - time * 0.16) * 4.0 + radius, sin(angle - time * 0.16) * 4.0 - time * 0.04));
        color += vec3(1.0, 0.52, 0.18) * ring * ringFlow * 0.11;
        alpha += ring * 0.08;

        // Gravitationally warped thickness: the inner disk puffs upward and
        // downward around the shadow before flattening into the outer flow.
        // This reads as a volume bending around the hole rather than a ring
        // drawn on one plane.
        float warpAmount = 0.075 * exp(-screenRadius * 3.1) * (0.58 + 0.42 * ringFlow);
        float warpedY = p.y - sign(p.y + 0.0001) * warpAmount;
        float warpedRadius = length(vec2(p.x * 0.94, warpedY / 0.34));
        float warpedBody = smoothstep(1.28, 0.72, warpedRadius) * smoothstep(0.18, 0.31, warpedRadius);
        float warpedCloud = fbm(vec2(warpedRadius * 9.0 - phase * 1.5, angle * 3.0 + time * 0.18));
        color += heat(warpedRadius * 0.9) * warpedBody * (0.12 + warpedCloud * 0.3) * 0.72;
        alpha += warpedBody * 0.24;

        // Explicit front/rear folds make the depth legible at a glance. The
        // near fold rises toward the viewer under the shadow while the rear
        // fold falls away behind it; their centerlines are curved, not planar.
        float foldNoise = fbm(vec2(p.x * 3.8 + time * 0.045, p.y * 4.1 - time * 0.035));
        float foldShape = 1.0 - exp(-p.x * p.x * 2.4);
        float nearFoldY = -0.105 - 0.22 * foldShape + (foldNoise - 0.5) * 0.05;
        float nearFoldWidth = 0.055 + 0.095 * exp(-p.x * p.x * 3.2);
        float nearFold = exp(-abs(p.y - nearFoldY) / nearFoldWidth) * smoothstep(0.18, 0.255, screenRadius);
        nearFold *= 1.0 - smoothstep(0.42, 1.12, abs(p.x));
        nearFold *= 0.18;
        float farFoldY = 0.095 + 0.17 * foldShape + (foldNoise - 0.5) * 0.04;
        float farFoldWidth = 0.04 + 0.068 * exp(-p.x * p.x * 2.5);
        float farFold = exp(-abs(p.y - farFoldY) / farFoldWidth) * smoothstep(0.21, 0.3, screenRadius);
        farFold *= 1.0 - smoothstep(0.42, 1.12, abs(p.x));
        farFold *= 0.14;
        float nearInnerEdge = exp(-abs(p.y - nearFoldY) / max(nearFoldWidth * 0.42, 0.001));
        color += vec3(1.12, 0.62, 0.27) * nearFold * (0.58 + foldNoise * 0.52) * 1.42;
        color += vec3(1.18, 0.86, 0.46) * nearInnerEdge * smoothstep(0.18, 0.3, screenRadius) * 0.42;
        color += vec3(0.62, 0.12, 0.12) * farFold * (0.35 + foldNoise * 0.45) * 0.52;
        alpha += nearFold * 0.9 + nearInnerEdge * 0.2 + farFold * 0.28;

        // A near-side crescent hugs the event-horizon silhouette. It is
        // composited after the shadow, so the lower disk visibly wraps over
        // the black hole instead of stopping at a straight planar edge.
        if (p.y < -0.02) {
        float arcWarp = (fbm(vec2(angle * 3.2 + time * 0.12, screenRadius * 12.0)) - 0.5) * 0.012;
        float lowerArcMask = smoothstep(0.02, 0.62, -p.y);
        float lowerArc = exp(-pow((screenRadius + arcWarp - 0.218) * 24.0, 2.0)) * lowerArcMask;
        float arcFilament = 0.42 + 0.58 * fbm(vec2(angle * 4.8 - time * 0.22, screenRadius * 19.0));
        color += vec3(1.15, 0.67, 0.32) * lowerArc * arcFilament * 1.15;
        alpha += lowerArc * 0.78;
        }

        // Short ray-march through the disk thickness. The sample position
        // shifts with depth, so the near and far surfaces do not collapse to
        // the same ellipse; noisy density creates smoky tendrils between them.
        vec3 volumeColor = vec3(0.0);
        float volumeAlpha = 0.0;
        for (int vi = 0; vi < 9; vi++) {
          float vz = (float(vi) / 8.0 - 0.5) * 2.0;
          float bend = vz * (0.18 + 0.1 * exp(-p.x * p.x * 2.0));
          vec2 vp = vec2(p.x, p.y + bend + 0.035 * sin(p.x * 4.0 + vz * 3.0 + time * 0.22));
          float vr = length(vec2(vp.x, vp.y / 0.27));
          float shell = exp(-pow((vr - 0.82) * 3.8, 2.0)) * smoothstep(1.55, 0.22, vr);
          if (shell < 0.000001) continue;
          float volumeNoise = fbm(vec2(vr * 7.0 - phase * 1.4 + vz * 2.0, angle * 2.5 + vz * 3.0 - time * 0.16));
          float density = shell * (0.18 + volumeNoise * 0.62) * (0.7 + 0.3 * (1.0 - abs(vz)));
          float sampleAlpha = density * 0.08;
          volumeColor += heat(vr * 1.1) * density * 0.075 * (1.0 - volumeAlpha);
          volumeAlpha += sampleAlpha * (1.0 - volumeAlpha);
        }
        color += volumeColor;
        alpha += volumeAlpha;

        // A broad, turbulent corona bridges the inner disk into the rim. Its
        // asymmetric lobe prevents the near side from ending in a clean wedge.
        if (screenRadius < 1.6) {
        float coronaNoise = fbm(p * 5.4 + vec2(time * 0.08, -time * 0.06));
        float corona = exp(-pow((screenRadius - 0.245) * 8.2, 2.0)) * (0.58 + coronaNoise * 0.42);
        float coronaLobe = 0.88 + 0.42 * smoothstep(-0.75, 0.12, -p.x) + 0.22 * smoothstep(-0.08, 0.72, abs(p.y));
        color += vec3(1.15, 0.78, 0.42) * corona * coronaLobe * 0.88;
        alpha += corona * 0.66;

        // A lower, noisy veil wraps under the shadow and fades into the wider
        // nebula. It is deliberately broad so the underside is enveloped,
        // rather than reading as a second crisp ring.
        float auraNoise = fbm(p * 3.4 + vec2(-time * 0.045, time * 0.032));
        float aura = exp(-pow((screenRadius - 0.38) * 4.4, 2.0)) * (0.26 + auraNoise * 0.74);
        // gl_FragCoord.y grows upward, so the near (lower) side is -p.y.
        // Keep the veil weighted toward that side; the far side should remain
        // something the event-horizon shadow can occlude.
        float lowerBias = 0.5 + 0.5 * smoothstep(-0.72, 0.08, -p.y);
        color += vec3(0.78, 0.25, 0.16) * aura * lowerBias * 0.42;
        alpha += aura * lowerBias * 0.28;
        float lowerRimNoise = fbm(p * 7.2 + vec2(time * 0.06, -time * 0.04));
        float lowerRim = exp(-pow((screenRadius - 0.255) * 13.0, 2.0)) * smoothstep(-0.62, 0.02, -p.y) * (0.42 + lowerRimNoise * 0.58);
        color += vec3(1.0, 0.48, 0.22) * lowerRim * 0.54;
        alpha += lowerRim * 0.34;

        // Dense inner streams keep the shadow embedded in the flow. These
        // offset bands twist with the local orbital phase instead of forming
        // a clean, isolated circle around the event horizon.
        float vortexAngle = atan(p.y, p.x);
        float vortexNoise = fbm(vec2(cos(vortexAngle) * 4.2 + screenRadius * 8.0, sin(vortexAngle) * 4.2 - time * 0.34));
        float streamRadius = 0.29 + 0.052 * sin(vortexAngle * 3.0 - time * 1.05 + vortexNoise * 3.0);
        float stream = exp(-pow((screenRadius - streamRadius) * 24.0, 2.0)) * smoothstep(0.16, 0.25, screenRadius) * (1.0 - smoothstep(0.55, 0.76, screenRadius));
        float streamBreakup = 0.35 + 0.65 * fbm(vec2(vortexAngle * 3.2 - time * 0.6, screenRadius * 18.0 + time * 0.12));
        color += heat(screenRadius * 1.5) * stream * streamBreakup * 0.95;
        alpha += stream * streamBreakup * 0.7;

        // Tiny hot knots drift through the inner disk, giving the eye motion
        // cues at the scale of the black-hole shadow.
        vec2 particleSpace = vec2(
          (vortexAngle - time * (0.36 + 0.16 / (screenRadius + 0.2))) / TAU * 42.0,
          screenRadius * 34.0
        );
        vec2 particleCell = floor(particleSpace);
        vec2 particleLocal = fract(particleSpace) - 0.5;
        float particleSeed = hash21(particleCell + vec2(8.0, 19.0));
        vec2 particleOffset = vec2(hash21(particleCell + 31.0), hash21(particleCell + 67.0)) - 0.5;
        float particle = exp(-dot(particleLocal - particleOffset * 0.72, particleLocal - particleOffset * 0.72) * 155.0);
        particle *= step(0.68, particleSeed) * smoothstep(0.16, 0.54, screenRadius) * (1.0 - smoothstep(0.54, 0.7, screenRadius));
        color += vec3(1.0, 0.62, 0.28) * particle * (0.72 + 0.5 * sin(time * 2.6 + particleSeed * 18.0));
        alpha += particle * 0.9;
        }

        // Thin event-horizon glow, with the foreground shadow kept genuinely black.
        float horizon = exp(-pow((screenRadius - 0.205) * 36.0, 2.0));
        float pulse = 0.88 + 0.12 * sin(time * 2.3 + turbulent * 4.0);
        color += vec3(1.15, 0.95, 0.68) * horizon * pulse * 1.02;
        alpha += horizon * 0.8;
        color *= 1.0 - shadow * 0.96;

        // Depth cue for the accretion plane: the far (upper) side is hidden
        // by the shadow above, while a turbulent near-side fold is composited
        // back over the lower horizon. This makes the disk read as a tilted
        // volume instead of a flat ellipse, without ever painting over the
        // black interior of the hole.
        float frontSide = smoothstep(-0.04, 0.48, -p.y);
        if (frontSide > 0.0) {
        float frontWarp = (fbm(p * 4.8 + vec2(time * 0.11, -time * 0.08)) - 0.5) * 0.055;
        float frontRadius = length(vec2(p.x * 0.96, (p.y - frontWarp) / 0.24));
        float frontBody = (1.0 - smoothstep(0.92, 1.36, frontRadius)) * smoothstep(0.28, 0.44, frontRadius);
        float frontFilament = fbm(vec2(frontRadius * 8.0 - phase * 1.55, phase * 2.6 + frontRadius * 4.2));
        float frontWisps = pow(max(0.0, sin(frontRadius * 27.0 - phase * 5.0 + frontFilament * 7.0)), 3.0);
        float frontFlow = frontBody * frontSide * (0.34 + frontFilament * 0.52 + frontWisps * 0.18);
        float frontTendrils = exp(-pow((frontRadius - 1.12) * 3.0, 2.0)) * frontSide;
        frontTendrils *= 0.35 + 0.65 * fbm(vec2(angle * 5.0 + time * 0.12, radius * 6.0));
        float frontHighlight = exp(-pow((frontRadius - 0.36) * 15.0, 2.0)) * frontSide * smoothstep(0.13, 0.32, screenRadius);
        color += heat(frontRadius * 0.88) * frontFlow * 1.02;
        color += vec3(1.0, 0.48, 0.18) * frontTendrils * 0.42;
        color += vec3(1.08, 0.72, 0.36) * frontHighlight * 0.78;
        alpha += frontFlow * 0.64 + frontTendrils * 0.2 + frontHighlight * 0.42;
        }

        // Foreground veil: a warped near sheet crosses over most of the lower
        // shadow, while the upper/back cap remains dark. The stretched noise
        // keeps this from becoming a flat circular patch.
        if (p.y < 0.26 && abs(p.x) < 0.41 && abs(p.y) < 0.6) {
        float occlusionNoise = fbm(p * 8.2 + vec2(time * 0.16, -time * 0.12));
        float occlusionSide = smoothstep(-0.26, 0.18, -p.y);
        float veilWarp = (fbm(vec2(p.x * 4.2 + time * 0.10, p.y * 2.6 - time * 0.08)) - 0.5) * 0.12
          + 0.045 * sin(p.x * 5.0 - time * 0.38);
        float veilRadius = length(vec2(p.x * 1.03, (p.y - veilWarp) * 1.10));
        float occlusionCore = 1.0 - smoothstep(0.09, 0.42, veilRadius);
        float occlusionFlow = fbm(vec2(
          p.x * 10.0 - phase * 1.4 + time * 0.12,
          p.y * 3.8 + phase * 0.34 - time * 0.06
        ));
        occlusionFlow = 0.40 + occlusionFlow * 0.44
          + pow(max(0.0, sin(p.x * 13.0 - p.y * 4.0 - time * 0.45 + occlusionNoise * 4.0)), 2.0) * 0.16;
        float frontOcclusion = occlusionSide * occlusionCore * (0.52 + 0.48 * occlusionNoise) * occlusionFlow;
        color += heat(0.42 + occlusionNoise * 0.22) * frontOcclusion * 1.08;
        color += vec3(0.62, 0.12, 0.09) * frontOcclusion * (1.0 - occlusionSide) * 0.16;
        alpha += frontOcclusion * 0.92;
        }

        if (p.y < 0.48 && screenRadius < 1.7) {
        float foregroundNoise = fbm(p * 6.0 + vec2(time * 0.14, -time * 0.10));
        float foregroundVeil = exp(-pow((screenRadius - 0.32 - (foregroundNoise - 0.5) * 0.055) * 4.4, 2.0));
        foregroundVeil *= smoothstep(-0.48, 0.08, -p.y) * (1.0 - shadow);
        foregroundVeil *= 0.48 + 0.52 * foregroundNoise;
        color += mix(vec3(0.56, 0.09, 0.10), vec3(1.02, 0.46, 0.18), foregroundNoise) * foregroundVeil * 0.92;
        alpha += foregroundVeil * 0.76;
        }

        // Reassert the far/back cap after the foreground pass.
        float farCap = 1.0 - smoothstep(-0.16, 0.06, -p.y);
        float farShadowMask = shadow * farCap * 0.96;
        color *= 1.0 - farShadowMask;
        alpha *= 1.0 - farShadowMask;

        }

        // Opposing relativistic jets. Their core breathes independently from
        // the disk so the beam reads as hot, pulsing plasma.
        // The reference beam rises from lower-left to upper-right as a straight
        // launch ray. The surrounding disk supplies the gravitational bloom;
        // the jet itself stays collimated.
        vec2 jetSpace = rotate(-0.43) * p;
        float jetCurve = 0.004 * sin(jetSpace.y * 2.4 - time * 0.65);
        float jetDistance = jetSpace.x + jetCurve;
        // Relativistic beaming is broadest at the launch point, then collimates
        // into a fine ray as it leaves the disk. Keep both profiles feathered
        // so the widening does not create another visible seam.
        float jetCoreWidth = mix(9.0, 132.0, smoothstep(0.12, 0.95, abs(jetSpace.y)));
        float jetVeilWidth = mix(3.5, 29.0, smoothstep(0.12, 0.95, abs(jetSpace.y)));
        float jetLine = exp(-abs(jetDistance) * jetCoreWidth);
        float jetVeil = exp(-abs(jetDistance) * jetVeilWidth);
        float jetLength = (0.46 + 0.54 * smoothstep(0.0, 0.18, abs(jetSpace.y))) * exp(-max(abs(jetSpace.y) - 0.55, 0.0) * 0.72);
        float jetPulse = 0.58 + 0.42 * (0.5 + 0.5 * sin(time * 2.0 - abs(jetSpace.y) * 4.4));
        float jets = (jetLine * 0.75 + jetVeil * 0.10) * jetLength * jetPulse * (1.0 - shadow);
        float launchPlume = exp(-abs(jetDistance) * 5.0) * exp(-abs(jetSpace.y) * 4.2) * (1.0 - shadow);
        vec3 jetHue = mix(vec3(1.0, 0.97, 0.86), vec3(0.68, 0.16, 0.34), smoothstep(0.2, 1.25, abs(jetSpace.y)));
        color += jetHue * jets * 0.92;
        color += vec3(1.0, 0.97, 0.88) * jetLine * jetLength * (1.0 - shadow) * 0.48;
        color += vec3(1.0, 0.62, 0.3) * launchPlume * 0.42;
        alpha += jets * 0.68;

        // Let the beam dissolve into the bright rim at the launch point. The
        // shadow multiplication below still occludes the center, so the ray
        // cannot visibly draw through the black hole itself.
        float launchCorona = exp(-pow((screenRadius - 0.225) * 23.0, 2.0)) * exp(-abs(jetDistance) * 18.0);
        launchCorona *= 0.78 + 0.22 * sin(time * 2.1 + turbulent * 3.0);
        color += vec3(1.0, 0.72, 0.4) * launchCorona * 0.72;
        alpha += launchCorona * 0.48;

        // Stable, sparse stars; brighter stars receive a small colored bloom.
        vec2 starSpace = uv * uResolution.y / 5.0;
        vec2 cell = floor(starSpace);
        vec2 local = fract(starSpace) - 0.5;
        float seed = hash21(cell);
        vec2 starOffset = vec2(hash21(cell + 17.0), hash21(cell + 61.0)) - 0.5;
        float star = exp(-dot(local - starOffset, local - starOffset) * 210.0);
        float selected = step(0.985, seed);
        float twinkle = 0.65 + 0.35 * sin(time * (0.7 + seed * 1.9) + seed * 20.0);
        color += vec3(0.74, 0.78, 0.95) * star * selected * twinkle * 0.62;
        alpha += star * selected * 0.58;


        // Tone map the HDR-like hand-drawn light and fade the outer boundary.
        color = 1.0 - exp(-max(color, vec3(0.0)) * 1.25);
        float vignette = 1.0 - smoothstep(0.55, 1.08, length((uv - 0.5) * vec2(0.82, 1.0)));
        color *= mix(0.54, 1.0, vignette);
        alpha = clamp(alpha * (0.74 + 0.26 * vignette), 0.0, 0.92);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  })

  const geometry = new THREE.PlaneGeometry(2, 2)
  scene.add(new THREE.Mesh(geometry, material))

  let frame = 0
  let elapsed = 0
  let previous = 0
  let nextFrameTime = 0
  let disposed = false
  let contextLost = false
  let inViewport = true
  let lastWidth = 0
  let lastHeight = 0
  let lastPixelRatio = 0
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')

  function resize() {
    const width = Math.max(1, canvas.clientWidth)
    const height = Math.max(1, canvas.clientHeight)
    // This is a decorative backdrop. Keep the shader below full device
    // resolution so it never competes with input, scrolling, or text.
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.25) * 0.72
    if (width === lastWidth && height === lastHeight && pixelRatio === lastPixelRatio) return
    lastWidth = width
    lastHeight = height
    lastPixelRatio = pixelRatio
    renderer.setPixelRatio(pixelRatio)
    renderer.setSize(width, height, false)
    renderer.getDrawingBufferSize(uniforms.uResolution.value)
    if (!contextLost && !document.hidden && inViewport) renderer.render(scene, camera)
  }

  function draw(now: number) {
    if (disposed || contextLost || document.hidden || !inViewport) return
    if (nextFrameTime && now < nextFrameTime) {
      frame = requestAnimationFrame(draw)
      return
    }
    elapsed += previous ? Math.min((now - previous) / 1000, 0.05) : 0
    previous = now
    nextFrameTime = now + 1000 / 60
    uniforms.uTime.value = elapsed
    renderer.render(scene, camera)
    if (!reduced.matches) frame = requestAnimationFrame(draw)
  }

  function resume() {
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    previous = 0
    nextFrameTime = 0
    if (!disposed && !contextLost && !document.hidden && inViewport)
      frame = requestAnimationFrame(draw)
  }

  function pause() {
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    previous = 0
  }

  function contextLostHandler(event: Event) {
    event.preventDefault()
    contextLost = true
    pause()
  }

  function contextRestoredHandler() {
    contextLost = false
    // Force the next resize pass to re-apply the drawing buffer dimensions;
    // browsers may recreate the context with a fresh default framebuffer.
    lastWidth = 0
    lastHeight = 0
    lastPixelRatio = 0
    try {
      resize()
      resume()
    } catch {
      // A second restoration failure should leave the decorative layer paused
      // without affecting the dashboard itself.
      contextLost = true
      pause()
    }
  }

  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  const intersection =
    typeof IntersectionObserver === 'undefined'
      ? undefined
      : new IntersectionObserver(([entry]) => {
          inViewport = Boolean(entry?.isIntersecting && entry.intersectionRatio > 0)
          if (inViewport) resume()
          else pause()
        })
  intersection?.observe(canvas)
  document.addEventListener('visibilitychange', resume)
  reduced.addEventListener('change', resume)
  canvas.addEventListener('webglcontextlost', contextLostHandler)
  canvas.addEventListener('webglcontextrestored', contextRestoredHandler)
  resize()
  // Compile outside the first interactive frame when the browser exposes
  // KHR_parallel_shader_compile through Three.js. The optional call keeps the
  // visual fallback and test renderer compatible with older implementations.
  const compileAsync = (renderer as THREE.WebGLRenderer & {
    compileAsync?: (scene: THREE.Scene, camera: THREE.Camera) => Promise<unknown>
  }).compileAsync
  if (compileAsync) void compileAsync.call(renderer, scene, camera).catch(() => undefined)
  resume()

  return () => {
    if (disposed) return
    disposed = true
    pause()
    observer.disconnect()
    intersection?.disconnect()
    document.removeEventListener('visibilitychange', resume)
    reduced.removeEventListener('change', resume)
    canvas.removeEventListener('webglcontextlost', contextLostHandler)
    canvas.removeEventListener('webglcontextrestored', contextRestoredHandler)
    geometry.dispose()
    material.dispose()
    renderer.dispose()
  }
}
