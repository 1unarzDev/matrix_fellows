import * as THREE from 'three'

/** An artistic lens map, not a numerical general-relativity solver. */
export function createAccessCosmos(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'default' })
  renderer.debug.onShaderError = () => {
    throw new Error('Cosmic shader unavailable')
  }
  const scene = new THREE.Scene()
  const camera = new THREE.Camera()
  const uniforms = { uSize: { value: new THREE.Vector2() }, uTime: { value: 0 } }
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `void main(){gl_Position=vec4(position.xy,0.,1.);}`,
    fragmentShader: `
      precision highp float;
      uniform vec2 uSize;
      uniform float uTime;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
      float field(vec2 p){return .57*noise(p)+.28*noise(p*2.07)+.15*noise(p*4.13);}
      // Differential rotation: inner material travels faster than outer material.
      float flow(float r,float a,float lane){
        float phase=a-uTime*(.16+.35/(r*r+.45));
        float grain=field(vec2(r*18.+cos(phase)*4.,sin(phase)*4.+r*.8+lane));
        float bands=r*65.+grain*7.+sin(phase*4.)*1.3;
        float coverage=1.-smoothstep(.4,2.8,fwidth(bands));
        float filaments=pow(.5+.5*sin(bands)*coverage,3.);
        return (.3+grain*.85)*(.62+filaments*.65);
      }
      vec3 heat(float r){return mix(vec3(1.,.86,.62),vec3(.64,.42,.72),smoothstep(1.1,3.9,r));}
      void main(){
        vec2 uv=gl_FragCoord.xy/uSize;
        float aspect=uSize.x/uSize.y;
        bool narrow=aspect<1.;
        vec2 center=narrow?vec2(.67,.74):vec2(.76,.51);
        float scale=narrow? .24 : .27;
        vec2 p=(uv-center)/scale; p.x*=aspect;
        float tilt=-.15;
        p=mat2(cos(tilt),-sin(tilt),sin(tilt),cos(tilt))*p;
        float r=length(p),a=atan(p.y,p.x);
        vec3 color=vec3(.022,.029,.047);
        float haze=exp(-r*r*.11);
        color+=vec3(.052,.027,.069)*haze;
        // Sparse stable stellar field with fine analytic point coverage.
        vec2 sp=uv*uSize.y/4.;vec2 cell=floor(sp);vec2 local=fract(sp);
        float seed=hash(cell);vec2 star=vec2(hash(cell+19.),hash(cell+71.));
        float point=exp(-dot(local-star,local-star)*170.);
        color+=vec3(.57,.61,.72)*point*step(.997,seed)*(.3+.7*seed);
        // Broad low-frequency radiance, separate from the resolved disk texture.
        float lens=exp(-pow((r-1.08)*4.2,2.));
        color+=vec3(.19,.105,.049)*lens;
        float ring=exp(-pow((r-1.025)*52.,2.));
        float ringAngle=a-uTime*.22;
        float ringFlow=.72+.28*field(vec2(cos(ringAngle)*8.,sin(ringAngle)*8.+r*80.));
        color+=vec3(1.,.72,.36)*ring*ringFlow*.72;
        // Upper/lower images of the disk wrap round the central shadow.
        float arcR=1.12+max(0.,p.y)*.045;
        float arc=exp(-pow((r-arcR)*14.,2.));
        float bend=flow(r*1.28,a,13.);
        float arcMask=smoothstep(-.28,.18,p.y)+.28*(1.-smoothstep(-.8,.02,p.y));
        color+=heat(r*1.35)*arc*bend*arcMask*1.05;
        // Physical disk seen almost edge-on. Back half is occluded; front
        // half crosses the shadow as in the reference's lensed accretion image.
        vec2 d=vec2(p.x,p.y/.135);
        float dr=length(d), da=atan(d.y,d.x);
        float inner=smoothstep(.98,1.12,dr);
        float outer=exp(-max(0.,dr-1.18)*.78);
        float visible=1.-(1.-smoothstep(1.015,1.04,r))*smoothstep(-.004,.004,p.y);
        float disk=inner*outer*visible;
        float beaming=1.-.6*p.x/sqrt(1.+p.x*p.x);
        color+=heat(dr)*flow(dr,da,0.)*disk*beaming*.9;
        float diskGlow=exp(-abs(p.y)*11.)*exp(-abs(p.x)*.35);
        color+=vec3(.21,.095,.029)*diskGlow*.45;
        // Preserve an actual dark shadow except for the foreground disk.
        float shadow=1.-smoothstep(.985,1.015,r);
        color*=1.-shadow*.94*(1.-disk*.85);
        color=1.-exp(-color*1.25);
        // Soft vignette does not erase the detailed light near the horizon.
        color*=1.-.28*smoothstep(.25,.8,length(uv-.5));
        gl_FragColor=vec4(color,1.);
      }
    `,
    depthTest: false,
    depthWrite: false,
  })
  const geometry = new THREE.PlaneGeometry(2, 2)
  scene.add(new THREE.Mesh(geometry, material))
  let raf = 0,
    disposed = false,
    elapsed = 0,
    previous = 0
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  function resize() {
    const width = canvas.clientWidth,
      height = canvas.clientHeight
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2))
    renderer.setSize(width, height, false)
    renderer.getDrawingBufferSize(uniforms.uSize.value)
    renderer.render(scene, camera)
  }
  function frame(now: number) {
    if (disposed || document.hidden) return
    elapsed += previous ? Math.min((now - previous) / 1000, 0.05) : 0
    previous = now
    uniforms.uTime.value = elapsed
    renderer.render(scene, camera)
    if (!reduced.matches) raf = requestAnimationFrame(frame)
  }
  function resume() {
    cancelAnimationFrame(raf)
    previous = 0
    if (!document.hidden && !disposed) raf = requestAnimationFrame(frame)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  document.addEventListener('visibilitychange', resume)
  reduced.addEventListener('change', resume)
  try {
    resize()
    resume()
  } catch (error) {
    observer.disconnect()
    document.removeEventListener('visibilitychange', resume)
    reduced.removeEventListener('change', resume)
    geometry.dispose()
    material.dispose()
    renderer.dispose()
    throw error
  }
  return () => {
    disposed = true
    cancelAnimationFrame(raf)
    observer.disconnect()
    document.removeEventListener('visibilitychange', resume)
    reduced.removeEventListener('change', resume)
    geometry.dispose()
    material.dispose()
    renderer.dispose()
  }
}
