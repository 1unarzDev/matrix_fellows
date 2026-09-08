// Original shaders. Art/technical references and adaptation notes: docs/art-direction.md.
export const screenVertex = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const smooth = (a: number, b: number, value: number) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
export const floodHeight = (progress: number) =>
  2 * smooth(1.28, 1.55, progress) + 16 * smooth(1.65, 1.98, progress)
export const cameraFloodRise = (progress: number, baseHeight?: number) => {
  const flood = floodHeight(progress)
  // During the first two units of flooding, compensate the actual descent
  // instead of introducing a second independently timed upward motion.
  const lift = baseHeight !== undefined && progress >= 1.35 && progress <= 2.1
    ? Math.max(0, flood - 2) + Math.min(2, flood) * Math.max(0, Math.min(1, (4.4 - baseHeight) / 2.8))
    : flood * smooth(1.58, 1.65, progress)
  return lift * (1 - smooth(3.15, 4.15, progress))
}
export function lightningState(seconds: number) {
  const seed = Math.floor(seconds / 7)
  const value = Math.sin(seed * 127.1 + 11 * 311.7) * 43758.5453
  const delay = 0.8 + (value - Math.floor(value)) * 1.8
  const phase = (seconds % 7) - delay
  return { seed, intensity: smooth(0, 0.07, phase) * (1 - smooth(0.12, 0.65, phase)) }
}
export const stormStrength = (progress: number) =>
  smooth(1.06, 1.42, progress) * (1 - smooth(2.9, 3.15, progress))
export const rainStrength = (progress: number) =>
  smooth(1.06, 1.42, progress) * (1 - smooth(2.1, 2.38, progress))
export const weatherGLSL = /* glsl */ `
float floodHeight(float p) { return 2.0*smoothstep(1.28,1.55,p)+16.0*smoothstep(1.65,1.98,p); }
float stormStrength(float p) { return smoothstep(1.06,1.42,p)*(1.0-smoothstep(2.9,3.15,p)); }
float rainStrength(float p) { return smoothstep(1.06,1.42,p)*(1.0-smoothstep(2.1,2.38,p)); }
`

export const terrainGLSL = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);
}
float fbm(vec2 p) {
  float f=0.0, a=0.5;
  for(int i=0;i<4;i++){ f+=a*noise(p); p=mat2(1.6,-1.2,1.2,1.6)*p+13.1; a*=0.5; }
  return f;
}
float terrain(vec2 p, float reveal, float ocean) {
  // The banks stay in place. The storm raises the shared water surface around them.
  float ridge=p.y+3.0-p.x*.27-2.5*sin(p.x*.065);
  float width=mix(5.5,13.0,smoothstep(-1.0,1.0,ridge));
  float crest=8.0*exp(-ridge*ridge/(width*width));
  float h=2.7*sin(p.y*.062+p.x*.084)+1.9*sin(p.y*.034-p.x*.049);
  h+=.65*sin(p.x*.18+p.y*.12)+.24*noise(p*.15);
  vec2 basin=(p-vec2(7,-44))*vec2(.04,.033);
  basin+=vec2(sin(p.y*.11),sin(p.x*.13))*.13;
  float bank=length(basin);
  float bankEdge=(bank-1.35)*4.0;
  h+=4.0*exp(-bankEdge*bankEdge);
  // The oasis already exists behind the ridge; visibility comes from camera elevation.
  return h+crest-1.0-10.5*exp(-dot(basin,basin)*1.3);
}
`

export const worldFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform float uProgress;
uniform float uAspect;
uniform vec3 uCamera;
uniform vec3 uTarget;
uniform vec2 uClip;
uniform vec2 uLightning;
${terrainGLSL}
${weatherGLSL}


vec3 swell(vec2 p) {
  float strength=stormStrength(uProgress)*smoothstep(1.32,1.8,uProgress);
  // Keep the immediate camera surface calm enough to avoid an accidental dive;
  // the large wave field occupies the middle distance and horizon.
  strength*=smoothstep(9.0,38.0,distance(p,uCamera.xz));
  // Oblique, unequal swells cross the frame instead of charging the lens.
  // Slow cross-modulation breaks up long parallel ridges, with analytic slopes.
  vec2 d1=normalize(vec2(.84,.54)), d2=normalize(vec2(-.92,.39));
  vec2 d3=normalize(vec2(.35,-.94));
  float crossPhase=dot(p,d3)*.037+uTime*.12;
  float a=dot(p,d1)*.115-uTime*.48+.65*sin(crossPhase);
  float b=dot(p,d2)*.078-uTime*.34;
  float c=dot(p,d3)*.162-uTime*.39;
  float h=2.7*sin(a)+1.65*sin(b)+.65*sin(c);
  vec2 slope=2.7*cos(a)*(d1*.115+.65*cos(crossPhase)*d3*.037)
    +1.65*.078*cos(b)*d2+.65*.162*cos(c)*d3;
  // Resolve the distant surface into the mean-water horizon before the trace
  // range ends. Otherwise a crest at the range boundary becomes a floating cutout.
  float farLod=1.0-smoothstep(300.0,600.0,distance(p,uCamera.xz));
  return vec3(h,slope)*strength*farLod;
}
vec3 waves(vec2 p) {
  float h=0.0; vec2 slope=vec2(0);
  float calm=smoothstep(.55,.9,uProgress)*(1.0-smoothstep(1.10,1.42,uProgress));
  float amplitude=mix(.24,.85,stormStrength(uProgress)), frequency=.34;
  vec2 domain=p+vec2(noise(p*.055+uTime*.025),noise(p*.047-uTime*.021))*2.4;
  for(int i=0;i<7;i++) {
    float fi=float(i), angle=fi*2.39996+.27*sin(fi*3.1);
    vec2 direction=vec2(cos(angle),sin(angle));
    float phase=dot(direction,domain)*frequency+uTime*sqrt(frequency)*.85+fi*8.31;
    float wave=sin(phase), sharp=exp(wave-1.0);
    h+=(sharp-.46)*amplitude;
    slope+=direction*cos(phase)*sharp*amplitude*frequency;
    domain+=direction*wave*amplitude*.7;
    amplitude*=mix(.54,.46,calm); frequency*=1.91;
  }
  // Longer, unequal cross-currents give the oasis breathing room between fine
  // highlights. Their slopes are coherent with their surface displacement.
  if(calm>.001) {
    vec2 d1=vec2(.8,.6), d2=vec2(-.6,.8);
    float a=dot(p,d1)*.22-uTime*.27;
    float b=dot(p,d2)*.37+uTime*.19;
    h+=calm*(.14*sin(a)+.065*sin(b));
    slope+=calm*(.14*.22*cos(a)*d1+.065*.37*cos(b)*d2);
  }
  return vec3(h,slope)+swell(p);
}
float sunCloudCover(vec3 ray, vec3 sun) {
  // A small cloud passes over the light source only. Its feathered footprint
  // must not become an extra full-sky weather transition.
  vec2 local=ray.xy-sun.xy;
  float ceiling=mix(.45,-.32,smoothstep(1.08,1.4,uProgress));
  float billow=fbm(local*7.0+vec2(uTime*.009,-uTime*.012));
  float density=smoothstep(ceiling-.14,ceiling+.14,local.y+(billow-.5)*.15);
  float footprint=1.0-smoothstep(.13,.32,length(local*vec2(1.0,1.2)));
  return density*footprint*smoothstep(1.08,1.2,uProgress);
}
vec3 sky(vec3 rd, vec3 sun) {
  float height=clamp(rd.y*1.6,0.0,1.0);
  float tropical=smoothstep(.6,1.35,uProgress);
  // Alto's Adventure dawn: peach light, dusty mauve distance, cool upper sky.
  vec3 horizon=mix(vec3(.76,.43,.23),vec3(.61,.39,.34),tropical);
  vec3 zenith=mix(vec3(.24,.19,.16),vec3(.12,.19,.26),tropical);
  vec3 c=mix(horizon,zenith,height);
  float ridgeReveal=smoothstep(.38,.85,uProgress)*(1.0-smoothstep(1.12,1.6,uProgress));
  float azimuth=atan(rd.x,-rd.z);
  for(int layer=0;layer<3;layer++) {
    float fi=float(layer);
    float ridge=.025+(.11-fi*.028)*noise(vec2(azimuth*(7.0+fi*2.0)+fi*19.0,3.0));
    ridge+=.055*exp(-pow((azimuth-.48+fi*.08)*3.0,2.0));
    float silhouette=1.0-smoothstep(ridge-.003,ridge+.003,rd.y);
    vec3 ridgeColor=mix(vec3(.39,.31,.34),vec3(.18,.23,.25),fi*.5);
    c=mix(c,ridgeColor,silhouette*ridgeReveal*(.5+fi*.12));
  }
  float s=max(dot(rd,sun),0.0);
  c += mix(vec3(.85,.44,.22),vec3(.55,.34,.12),tropical)*pow(s,12.0)*.4;
  c += vec3(1.0,.35,.12)*pow(s,180.0)*.48;
  // Project the luminous disk into the same lens plane as its bloom. An angular
  // disk stretches/leans off-axis, even when the added glow is perfectly centered.
  vec3 viewForward=normalize(uTarget-uCamera);
  vec3 viewRight=normalize(cross(viewForward,vec3(0,1,0)));
  vec3 viewUp=cross(viewRight,viewForward);
  vec2 rayLens=vec2(dot(rd,viewRight),dot(rd,viewUp))/max(.1,dot(rd,viewForward));
  vec2 solarLens=vec2(dot(sun,viewRight),dot(sun,viewUp))/max(.1,dot(sun,viewForward));
  float solarRadius=length(rayLens-solarLens);
  // A defined circular emitter. Rays are a separate, much dimmer lens layer;
  // they must not merge into the silhouette through saturated exposure.
  float disk=1.0-smoothstep(.027,.031,solarRadius);
  float core=1.0-smoothstep(0.0,.03,solarRadius);
  c += mix(vec3(2.1,1.25,.55),vec3(3.2,2.6,1.65),core)*disk;
  float storm=stormStrength(uProgress);
  if(storm>.001) {
    vec2 cloudUV=rd.xz/(.3+max(rd.y,0.0))*1.25+vec2(uTime*.035,-uTime*.012);
    float cloud=fbm(cloudUV+fbm(cloudUV*.7)*2.5);
    float fold=fbm(cloudUV*2.8+cloud*3.0);
    vec3 overcast=mix(vec3(.008,.016,.028),vec3(.18,.24,.27),smoothstep(.22,.72,cloud));
    overcast+=vec3(.09,.12,.14)*pow(max(0.0,fold),3.0);
    overcast=mix(vec3(.105,.155,.18),overcast,smoothstep(-.05,.45,rd.y));
    // A fresh seeded, branching path for each time-driven event. The CPU clock
    // spaces events at least 5 seconds apart, independent of scroll movement.
    float flash=uLightning.x, seed=uLightning.y;
    float segment=rd.y*48.0;
    float jagged=mix(hash(vec2(floor(segment),seed+4.0)),hash(vec2(floor(segment)+1.0,seed+4.0)),fract(segment));
    // Alternate sides with a fresh horizontal placement on each strike. Scale
    // the angular offset on narrow screens so both sides remain in view.
    float side=mod(seed,2.0)<1.0 ? -1.0 : 1.0;
    float anchor=side*(.12+hash(vec2(seed,2.0))*.34)*min(1.0,uAspect/1.25);
    float boltX=anchor+(noise(vec2(rd.y*9.0,seed+8.0))-.5)*.14+(jagged-.5)*.055;
    float bolt=exp(-abs(rd.x-boltX)*650.0), branch=0.0;
    for(int fork=0;fork<3;fork++) {
      float fi=float(fork), start=.18+hash(vec2(seed+fi,5.0))*.28;
      float direction=mix(-1.0,1.0,step(.5,hash(vec2(fi,seed+9.0))));
      float path=boltX+(rd.y-start)*direction*.65+(jagged-.5)*.02;
      branch+=exp(-abs(rd.x-path)*850.0)*smoothstep(start,start+.025,rd.y)*(1.0-smoothstep(start+.12,start+.17,rd.y));
    }
    float strike=(bolt+branch*.45)*smoothstep(.01,.07,rd.y)*(1.0-smoothstep(.55,.7,rd.y));
    overcast+=vec3(.15,.21,.27)*flash*pow(cloud,2.0);
    overcast+=vec3(1.3,1.8,2.2)*strike*flash;
    float cloudCover=sunCloudCover(rd,sun);
    // Warm forward scattering on the billowing edge, then a fully opaque bank.
    float silverLining=cloudCover*(1.0-cloudCover)*4.0*pow(s,65.0);
    overcast+=vec3(.55,.32,.16)*silverLining*(1.0-storm)*.7;
    c=mix(c,overcast,storm);
    // Keep the familiar global lighting progression; feather a little more
    // cloud over the source while the existing overcast is still gathering.
    c=mix(c,overcast,cloudCover*(1.0-storm)*.9);
  }
  return c;
}
void main() {
  float p=uProgress;
  float oasis=smoothstep(.15,.9,p);
  float ocean=smoothstep(1.28,1.92,p);
  float storm=stormStrength(p);
  float waterLevel=-1.0+floodHeight(p);
  float dive=smoothstep(2.15,2.72,p);
  float cosmos=smoothstep(3.15,4.15,p);
  vec2 uv=vUv;
  float waterline=smoothstep(2.16,2.68,p)*1.4-.2;
  waterline+=sin(uv.x*11.0+uTime*1.1)*.028+sin(uv.x*26.0-uTime*.7)*.012;
  float edge=exp(-abs(uv.y-waterline)*45.0)*smoothstep(2.1,2.3,p)*(1.0-smoothstep(2.6,2.8,p));
  uv.x+=sin(uv.y*55.0+uTime*1.3)*edge*.015;
  uv.y+=sin(uv.x*24.0-uTime)*edge*.009;
  vec2 screen=(uv-0.5)*vec2(uAspect,1.0);
  vec3 forward=normalize(uTarget-uCamera);
  vec3 right=normalize(cross(forward,vec3(0,1,0)));
  vec3 up=cross(right,forward);
  vec3 rd=normalize(forward+0.9326*(screen.x*right+screen.y*up));
  vec3 sun=normalize(vec3(0.48*min(1.0,uAspect/1.25),0.26,-1.0));
  float submerged=1.0-smoothstep(waterline-.018,waterline+.018,uv.y);
  submerged=max(submerged,smoothstep(2.68,2.75,p));
  // Once a pixel is fully underwater, the expensive sky and ocean raymarch
  // cannot contribute. Keep the feathered waterline on the full path.
  vec3 col=vec3(0.0);
  if(submerged<.999) col=sky(rd,sun);
  float sceneDistance=10000.0;
  float exposedGround=0.0;

  if(dive<0.999 && submerged<.999) {
    float dist=0.5; bool hit=false;
    vec3 pos=uCamera;
    for(int i=0;i<112;i++) {
      if(ocean>.95){dist=10000.0;break;}
      pos=uCamera+rd*dist;
      float d=pos.y-terrain(pos.xz,oasis,ocean);
      if(d<0.04){hit=true;break;}
      dist+=max(0.09,d*0.42);
      if(dist>190.0)break;
    }
    // Exhausting the march is not a clear line of sight through the ridge.
    // Keep the last verified distance; only a range exit is an actual miss.
    if(!hit && dist>190.0)dist=10000.0;
    else if(!hit)hit=true; // Shade the last near-surface sample instead of a sky pinhole.
    if(hit)sceneDistance=dist;
    float waterDist=rd.y<-.001 ? (waterLevel-uCamera.y)/rd.y : 10000.0;
    // Before expansion, water belongs only to the basin behind the dune ridge.
    vec2 waterPoint=(uCamera+rd*waterDist).xz;
    float basinRadius=length((waterPoint-vec2(7,-44))*vec2(.04,.033));
    bool inBasin=basinRadius<1.65+ocean*80.0 || ocean>.95;
    vec3 surface=vec3(0);
    bool swellHit=false;
    if(storm>.1 && p>1.4 && rd.y<.16) {
      float travel=.5, previous=.5;
      // The three swell amplitudes sum to five; their distance envelopes
      // never exceed one. Intersect that exact vertical bound before tracing
      // instead of marching empty sky above (or below) every possible crest.
      float crestBound=5.0*storm*smoothstep(1.32,1.8,p)+.01;
      float traceEnd=min(650.0,dist);
      if(abs(rd.y)>.0001) {
        float a=(waterLevel-crestBound-uCamera.y)/rd.y;
        float b=(waterLevel+crestBound-uCamera.y)/rd.y;
        travel=max(.5,min(a,b));
        previous=travel;
        traceEnd=min(traceEnd,max(a,b));
      }
      // Grazing rays can spend hundreds of short steps approaching a crest.
      // Most rays exit early; the larger ceiling prevents false sky gaps.
      for(int step=0;step<512;step++) {
        if(travel>traceEnd)break;
        vec3 samplePoint=uCamera+rd*travel;
        float clearance=samplePoint.y-waterLevel-swell(samplePoint.xz).x;
        if(clearance<0.0) {
          float lo=previous, hi=travel;
          for(int refine=0;refine<6;refine++) {
            float mid=(lo+hi)*.5;
            vec3 point=uCamera+rd*mid;
            if(point.y-waterLevel-swell(point.xz).x>0.0)lo=mid;else hi=mid;
          }
          waterDist=(lo+hi)*.5;swellHit=true;break;
        }
        previous=travel;
        travel+=clamp(clearance*.65,.35,8.0);
        if(travel>650.0 || travel>dist)break;
      }
      if(swellHit) {
        waterPoint=(uCamera+rd*waterDist).xz;
        basinRadius=length((waterPoint-vec2(7,-44))*vec2(.04,.033));
        inBasin=basinRadius<1.65+ocean*80.0 || ocean>.95;
      }
    }
    if(!swellHit && waterDist>0.0 && waterDist<dist && waterDist<2000.0 && inBasin) {
      for(int j=0;j<3;j++) {
        surface=waves((uCamera+rd*waterDist).xz);
        waterDist+=clamp((waterLevel+surface.x-(uCamera.y+rd.y*waterDist))/min(-.015,rd.y),-4.0,4.0);
      }
    }
    vec3 waterPosition=uCamera+rd*waterDist;
    bool wetGround=ocean>.95 || terrain(waterPosition.xz,oasis,ocean)<waterPosition.y;
    if(waterDist>0.0 && waterDist<dist && waterDist<2000.0 && inBasin && wetGround) {
      sceneDistance=waterDist;
      vec3 wp=uCamera+rd*waterDist;
      surface=waves(wp.xz);
      float detail=1.0-smoothstep(120.0,650.0,waterDist);
      vec3 broad=swell(wp.xz);
      vec2 slope=broad.yz+(surface.yz-broad.yz)*detail;
      vec3 n=normalize(vec3(-slope.x,1.0,-slope.y));
      vec3 reflected=reflect(rd,n);
      float fresnel=0.04+0.96*pow(clamp(1.0-dot(-rd,n),0.0,1.0),5.0);
      float depth=ocean>.95?35.0:max(.1,waterLevel-terrain(wp.xz,oasis,ocean));
      vec3 shallow=vec3(.09,.48,.32), deepWater=mix(vec3(.008,.14,.15),vec3(.006,.038,.105),ocean);
      vec3 transmission=mix(deepWater,shallow,exp(-depth*.23));
      // Overcast water loses the tropical green illumination before flooding.
      transmission=mix(transmission,vec3(.018,.065,.073),storm*.72);
      float caustic=pow(1.0-abs(sin(wp.x*.8+sin(wp.y+uTime*.3))*sin(wp.z*1.1-uTime*.35)),12.0);
      transmission+=vec3(.12,.23,.10)*caustic*exp(-depth*.5)*(1.0-ocean);
      float alignment=max(dot(reflected,sun),0.0);
      // Broad drifting patches modulate fine foam; avoid a uniform tiled sheen.
      float foamPatch=noise(wp.xz*.075+vec2(uTime*.035,-uTime*.024));
      float brokenFoam=noise(wp.xz*1.7+vec2(-uTime*.18,uTime*.09));
      transmission*=mix(.82,1.12,foamPatch);
      col=mix(transmission,sky(reflected,sun),fresnel);
      col+=vec3(1.0,.74,.38)*(pow(alignment,320.0)*2.1+pow(alignment,32.0)*.1)*(1.0-storm*.97);
      float foam=smoothstep(.18,.65,surface.x-broad.x)*smoothstep(.42,.72,brokenFoam)*mix(.2,1.0,foamPatch);
      float shore=(1.0-smoothstep(.0,.65,depth))*smoothstep(.35,.7,noise(wp.xz*4.0));
      col=mix(col,vec3(.51,.73,.69),clamp(foam*.20+shore*.5,0.0,.55));
      col=mix(col,sky(rd,sun),1.0-exp(-waterDist*mix(.008,.0018,storm)));
      float crest=smoothstep(1.8,3.9,broad.x)*storm*mix(.35,1.0,foamPatch);
      col+=vec3(.14,.23,.25)*crest;
      float spray=smoothstep(.15,.42,surface.x)*noise(wp.xz*3.0+uTime*1.5)*storm;
      col=mix(col,vec3(.26,.38,.40),spray*.25*foamPatch);
    } else if(hit) {
      exposedGround=1.0;
      float e=0.12;
      vec3 n=normalize(vec3(terrain(pos.xz-vec2(e,0),oasis,ocean)-terrain(pos.xz+vec2(e,0),oasis,ocean),2.0*e,terrain(pos.xz-vec2(0,e),oasis,ocean)-terrain(pos.xz+vec2(0,e),oasis,ocean)));
      float light=max(dot(n,sun),0.0);
      float mineral=noise(pos.xz*.045);
      float ripple=sin(pos.x*18.0+sin(pos.z*.42)*3.0+pos.z*4.0)*.015*exp(-dist*.022);
      vec3 shadow=mix(vec3(.16,.095,.055),vec3(.30,.17,.095),mineral);
      vec3 sand=mix(vec3(.64,.35,.17),vec3(.94,.59,.32),mineral);
      col=mix(shadow,sand,pow(light,.7)) + ripple;
      col+=vec3(.14,.085,.045)*pow(max(0.0,n.y),4.0);
      // Clouds remove the direct sun, not the sediment's material color.
      // Broad neutral skylight retains relief without blue-tinting the banks.
      float sedimentLuma=dot(sand,vec3(.2126,.7152,.0722));
      vec3 dampSediment=mix(sand,vec3(sedimentLuma)*vec3(1.04,1.0,.93),.78);
      vec3 overcastSand=dampSediment*(.16+.20*max(n.y,0.0))+ripple*.25;
      col=mix(col,overcastSand,storm);
      // Sand stays sand. Raised shoreline reeds and palms provide the greenery;
      // only a narrow strip of wet sediment darkens alongside the water.
      float wetSand=(1.0-smoothstep(waterLevel+.3,waterLevel+1.45,pos.y))*oasis;
      col=mix(col,col*vec3(.62,.65,.68),wetSand*.65);
      float rainCurtain=smoothstep(1.4,1.59,p)*(1.0-smoothstep(1.94,2.12,p));
      float rainBank=noise(pos.xz*.055+vec2(-uTime*.045,uTime*.025));
      float bankMist=rainCurtain*smoothstep(10.0,65.0,dist)*(.025+rainBank*.025);
      float fog=1.0-exp(-dist*(mix(.013,.005,oasis)+storm*.008+bankMist));
      // Rain veils distant terrain; nearby land stays readable until submerged.
      vec3 atmosphere=mix(vec3(.67,.40,.23),vec3(.095,.12,.125),storm);
      atmosphere+=vec3(.055,.06,.065)*uLightning.x*storm;
      col=mix(col,atmosphere,fog);
    }
    if(oasis<.999) {
    float dust=fbm(vec2(uv.x*3.0-uTime*.16,uv.y*8.0+uTime*.035));
    float wisps=fbm(vec2(uv.x*1.4-uTime*.22,uv.y*16.0+sin(uv.x*2.0)*1.3));
    float dustStorm=(1.0-oasis)*(.08+pow(dust,1.5)*.62+wisps*.19);
    col=mix(col,vec3(.62,.36,.18),dustStorm*.65);
    col+=vec3(.16,.08,.035)*pow(wisps,2.0)*(1.0-oasis);
    }
    // Lens response follows the projected light as the camera rises and descends.
    float sunDepth=dot(sun,forward);
    vec2 sunScreen=vec2(dot(sun,right),dot(sun,up))/max(.1,sunDepth)/.9326;
    vec2 lens=screen-sunScreen;
    float visibility=smoothstep(.15,.6,sunDepth)*(1.0-dive)*(1.0-storm)
      *(1.0-sunCloudCover(sun,sun));
    float lensRadius=length(lens);
    float lensAngle=atan(lens.y,lens.x);
    // Paired, feathered diffraction rays with no animated noise in the outline.
    float rays=pow(abs(cos(lensAngle*6.0)),18.0)*.65
      +pow(abs(cos(lensAngle*10.0+.35)),28.0)*.35;
    float rayFalloff=smoothstep(.033,.05,lensRadius)*exp(-lensRadius*28.0);
    float halo=exp(-pow(lensRadius/.17,2.0));
    // Faint anamorphic veiling glare: broad smooth tails, without a bright
    // horizontal bar or a solid colored lens ghost competing with the disk.
    float lensVeil=exp(-dot(lens*vec2(3.8,10.0),lens*vec2(3.8,10.0)));
    float lensStreak=exp(-pow(lens.y*75.0,2.0)-pow(lens.x*5.5,2.0));
    col+=(vec3(.85,.49,.20)*rays*rayFalloff*.17
      +vec3(.65,.28,.12)*halo*.14
      +vec3(.68,.38,.19)*lensVeil*.085
      +vec3(.9,.63,.36)*lensStreak*.07)*visibility;
    if(storm>.01) {
      float rain=0.0;
      for(int layer=0;layer<3;layer++) {
        float scale=1.0+float(layer)*.8;
        vec2 rainUV=vec2(uv.x*uAspect+uv.y*.18,uv.y)*vec2(110.0,18.0)*scale;
        rainUV+=vec2(uTime*9.0,uTime*25.0)*(1.0+float(layer)*.23);
        vec2 cell=floor(rainUV), local=fract(rainUV);
        float drop=exp(-abs(local.x-.5)*45.0)*smoothstep(.0,.14,local.y)*(1.0-smoothstep(.5,.95,local.y));
        rain+=drop*step(.75,hash(cell))/scale;
      }
      float mist=fbm(uv*vec2(4,8)+vec2(-uTime*.18,uTime*.02));
      float curtain=smoothstep(1.4,1.59,p)*(1.0-smoothstep(1.94,2.12,p));
      float veil=clamp(storm*(.10+mist*.2)+curtain*(.55+mist*.3),0.0,.94);
      vec3 rainHaze=mix(vec3(.085,.14,.17),vec3(.095,.12,.125),exposedGround);
      col=mix(col,rainHaze,veil*mix(1.0,.25,exposedGround));
      col+=vec3(.23,.32,.36)*rain*rainStrength(p)*.7;
    }
  }

  // Surface spray stays below the lens. Only the later dive crosses the waterline.
  if(p>1.28 && p<2.02) {
    float inundation=.16*storm*smoothstep(1.28,1.55,p)*(1.0-smoothstep(1.8,2.02,p));
    float crest=-.25+1.5*inundation+sin(uv.x*9.0+uTime*1.7)*.065+sin(uv.x*21.0-uTime*2.1)*.025;
    float cover=1.0-smoothstep(crest-.055,crest+.055,uv.y);
    vec2 current=uv*vec2(3.0,5.0)+vec2(uTime*.16,-uTime*.3);
    float churn=fbm(current+fbm(current*1.8)*2.5);
    float foam=smoothstep(.5,.72,fbm(current*4.0+churn*3.0));
    vec3 surge=mix(vec3(.014,.028,.035),vec3(.055,.085,.095),churn);
    surge+=vec3(.075,.09,.095)*foam*.45;
    col=mix(col,surge,cover);
    if(cover>.5)sceneDistance=.15;
  }

  if(submerged>0.0 && cosmos<.999) {
  vec2 warp=uv+vec2(sin(uv.y*9.0+uTime*.24),cos(uv.x*7.0-uTime*.19))*.022;
  float shaft=pow(max(0.0,sin((warp.x+warp.y*.3)*24.0+fbm(warp*3.0)*3.0)),8.0);
  // Refraction can move UVs below the frame. Fractional powers of negative
  // height produce NaNs on hardware GPUs and contaminate HDR bloom buffers.
  float lightHeight=clamp(uv.y,0.0,1.0);
  float overhead=lightHeight*lightHeight*exp(-abs(uv.x-.30)*3.0);
  vec3 deep=mix(vec3(.016,.023,.055),vec3(.025,.12,.16),lightHeight);
  deep+=vec3(.025,.19,.23)*overhead;
  // Original canyon silhouettes: Alto's night-time value layering translated
  // into submerged shelves. Different parallax rates separate their depths.
  float descent=smoothstep(2.2,3.15,p);
  for(int layer=0;layer<3;layer++) {
    float fi=float(layer);
    float x=(uv.x-.5)*uAspect+uCamera.x*(.003+fi*.002);
    float shelf=.10+fi*.025+pow(abs(x)*.65,1.7)*(.28+fi*.08);
    shelf+=noise(vec2(x*(2.3+fi*1.5)+fi*12.0,4.0))*(.20-fi*.035);
    shelf-=descent*(.055+fi*.025);
    float ridgeMask=1.0-smoothstep(shelf-.006,shelf+.006,uv.y);
    vec3 shelfColor=mix(vec3(.035,.105,.14),vec3(.008,.022,.039),fi*.5);
    deep=mix(deep,shelfColor,ridgeMask*(.6+fi*.16));
    float rim=exp(-abs(uv.y-shelf)*130.0);
    float mineralGlow=pow(noise(vec2(x*18.0+fi*9.0,2.0)),5.0);
    deep+=vec3(.055,.28,.30)*rim*mineralGlow*(1.0-fi*.25);
  }
  deep+=vec3(.045,.30,.35)*shaft*overhead*1.35;
  float beam1=exp(-pow((uv.x-.16-uv.y*.19)*14.0,2.0));
  float beam2=exp(-pow((uv.x-.45+uv.y*.04)*25.0,2.0));
  deep+=vec3(.035,.15,.18)*(beam1+beam2*.55)*pow(lightHeight,1.4);
  deep+=vec3(.015,.035,.058)*fbm(warp*7.0+uTime*.015);
  // A restrained violet-blue distant glow bridges the sea and later nebula.
  deep+=vec3(.055,.028,.11)*exp(-length((uv-vec2(.84,.38))*vec2(2.0,3.0))*3.5);
  float windowLight=exp(-length((uv-vec2(.55,1.12))*vec2(1.3,.9))*5.0);
  deep+=vec3(.10,.40,.42)*windowLight*(1.0-smoothstep(2.7,3.1,p));
  col=mix(col,deep,submerged);
  }
  if(submerged>.5)sceneDistance=10000.0;
  col+=vec3(.10,.36,.39)*edge*.55;

  if(cosmos>0.0) {
    vec2 q=screen*1.75;
    q*=mat2(.91,-.41,.41,.91);
    float n=fbm(q*2.0+vec2(uTime*.006,0));
    float clouds=fbm(q*3.0+vec2(n*3.0,-uTime*.008));
    float band=exp(-pow((q.y+sin(q.x*1.4)*.2+n*.5)*2.4,2.0));
    float veil=pow(clouds,2.0)*band;
    vec3 nebula=vec3(.008,.011,.026);
    nebula+=mix(vec3(.12,.17,.46),vec3(.52,.13,.20),smoothstep(-.5,.9,q.x))*veil*2.6;
    nebula+=vec3(.11,.28,.31)*pow(n,3.0)*band;
    float filaments=pow(1.0-abs(clouds*2.0-1.0),9.0)*band;
    nebula+=vec3(.21,.095,.12)*filaments*.55;
    col=mix(col,nebula,cosmos);
  }
  float vignette=1.0-smoothstep(.25,.95,length((uv-.5)*vec2(1.0,.82)))*.4;
  col*=vignette;
  col+=(hash(gl_FragCoord.xy+mod(uTime,100.0))-.5)*.009;
  // Share camera-space depth with real geometry in the following render pass.
  // Raw WebGL1 shader diagnostics omit this; the Nuxt world uses WebGL2.
  #if __VERSION__ >= 300
    float viewDepth=max(uClip.x,sceneDistance*dot(rd,forward));
    gl_FragDepth=clamp(uClip.y/(uClip.y-uClip.x)-(uClip.y*uClip.x)/((uClip.y-uClip.x)*viewDepth),0.0,1.0);
  #endif
  gl_FragColor=vec4(col,1.0);
}
`

export const particleVertex = /* glsl */ `
${weatherGLSL}
uniform float uTime;
uniform float uProgress;
uniform float uPixelRatio;
uniform float uAspect;
attribute float aSeed;
attribute vec4 aAnchor;
varying float vAlpha;
varying vec3 vColor;
varying float vStorm;
varying float vFish;
varying float vRain;
void main() {
  float oasis=smoothstep(.35,1.2,uProgress);
  float dive=smoothstep(1.7,2.9,uProgress);
  float stars=smoothstep(3.15,4.15,uProgress);
  vec3 sand=position;
  sand.x=mod(position.x+uTime*(6.0+aSeed*7.0)+24.0,48.0)-24.0;
  sand.y+=sin(uTime*1.1+position.z)*.45;
  vec3 water=position;
  water.y=-.8+sin(position.x*.6+uTime*.4)*.12;
  vec3 deep=position;
  deep.y=mod(position.y+uTime*.18+16.0,32.0)-16.0;
  deep.x+=sin(uTime*.12+aSeed*20.0)*.5;
  deep.z-=75.0;
  float schoolTime=uTime*.4;
  float axial=(mod(position.x+schoolTime*1.35+24.0,48.0)-24.0)*max(.62,uAspect*.95);
  // A single shared centerline with continuous depth/thickness, not discrete lanes.
  float spread=(fract(aSeed*137.0)+fract(aSeed*59.0)-1.0)*3.1;
  float depthSpread=(fract(aSeed*73.0)-.5)*10.0;
  // One broad current climbs across the view; continuous depth and thickness
  // retain the shared school without splitting it into separate ribbons.
  // Bow the shared current beneath the right-hand reading area, rather than
  // cutting a hole in the school or introducing a second stream. On phones,
  // the copy spans the view, so the whole current settles a little lower.
  float narrowView=1.0-smoothstep(.7,1.2,uAspect);
  float readingBend=mix(smoothstep(-5.0,13.0,axial)*4.5,4.8,narrowView);
  readingBend*=smoothstep(2.65,2.95,uProgress)*(1.0-smoothstep(3.35,3.8,uProgress));
  vec3 school=vec3(axial,-6.0+axial*.15+sin(axial*.075-schoolTime*.18)*2.0+spread-readingBend,-111.0+depthSpread+sin(axial*.12)*2.0);
  float fish=1.0-step(.7,aSeed);
  deep=mix(deep,school,fish);
  vec3 cosmic=position;
  cosmic.xy=mat2(cos(.12),-sin(.12),sin(.12),cos(.12))*cosmic.xy;
  cosmic.x+=sin(cosmic.y*.13)*2.5;
  cosmic=mix(cosmic,aAnchor.xyz,aAnchor.w);
  vec3 pos=mix(sand,water,oasis*(1.0-dive));
  float storm=stormStrength(uProgress);
  float rainfall=rainStrength(uProgress);
  vec3 rain=position;
  rain.x=mod(position.x-uTime*8.0+24.0,48.0)-24.0;
  rain.y=mod(position.y-uTime*28.0+15.0,30.0)-15.0;
  rain.z-=40.0;
  pos=mix(pos,rain,rainfall*(1.0-dive));
  pos=mix(pos,deep,dive);
  pos=mix(pos,cosmic,stars);
  pos.y+=floodHeight(uProgress)*(1.0-stars);
  pos=mix(pos,aAnchor.xyz,aAnchor.w*smoothstep(3.2,3.8,uProgress));
  vec4 mv=modelViewMatrix*vec4(pos,1.0);
  gl_Position=projectionMatrix*mv;
  vFish=fish*dive*(1.0-stars);
  vRain=rainfall*(1.0-dive);
  float size=mix(2.1,2.7,stars)+step(.985,aSeed)*5.5*stars+vFish*2.0+vRain*6.0;
  float anchorDistance=1.0-smoothstep(24.0,85.0,-aAnchor.z);
  size=mix(size,mix(11.0,8.0,anchorDistance),aAnchor.w*stars);
  gl_PointSize=clamp(size*uPixelRatio*24.0/max(4.0,-mv.z),.6,10.0*uPixelRatio);
  vAlpha=(.18+aSeed*.6)*smoothstep(0.0,3.0,-mv.z)*(1.0-smoothstep(38.0,65.0,-mv.z));
  vAlpha*=mix(1.0,.55,oasis*(1.0-dive));
  vColor=mix(vec3(.92,.68,.35),vec3(.22,.75,.70),dive);
  // Color follows the shared current, not a random per-fish rainbow.
  float hue=smoothstep(-24.0,24.0,axial);
  vec3 fishColor=mix(vec3(.16,.64,.78),vec3(.28,.45,.72),hue);
  vColor=mix(vColor,fishColor,vFish);
  vColor=mix(vColor,mix(vec3(.53,.66,1.0),vec3(1.0,.78,.53),aSeed),stars);
  vColor=mix(vColor,vec3(.85,1.1,1.35),aAnchor.w*stars);
  vColor=mix(vColor,vec3(.42,.62,.72),vRain);
  vAlpha*=.8+.2*sin(uTime*.5+aSeed*100.0);
  vAlpha=mix(vAlpha,.28+aSeed*.3,vFish);
  vAlpha*=mix(1.0,1.0-.35*smoothstep(.0,.8,gl_Position.x/gl_Position.w),vFish);
  vec2 screen=gl_Position.xy/gl_Position.w*.5+.5;
  float waterline=smoothstep(2.16,2.68,uProgress)*1.4-.2+sin(screen.x*11.0+uTime*1.1)*.028+sin(screen.x*26.0-uTime*.7)*.012;
  // Rain is an above-surface effect, never a layer over the underwater world.
  if(vRain>.001)vAlpha*=smoothstep(waterline-.018,waterline+.018,screen.y);
  vAlpha*=mix(1.0,1.0-smoothstep(waterline-.018,waterline+.018,screen.y),vFish);
  vAlpha*=mix(1.0,.38,stars*(1.0-aAnchor.w));
  vAlpha=mix(vAlpha,mix(.40,.9,anchorDistance),aAnchor.w*stars);
  vStorm=(1.0-oasis)*(1.0-dive);
}
`
export const particleFragment = /* glsl */ `
varying float vAlpha;
varying vec3 vColor;
varying float vStorm;
varying float vFish;
varying float vRain;
void main(){
  vec2 coord=(gl_PointCoord-.5)*2.0;
  coord.y*=1.0+vStorm*1.8;
  coord.x*=1.0+vRain*4.0;
  float d=length(coord);
  if(d>1.0)discard;
  float glow=exp(-d*d*6.0);
  float body=exp(-(coord.x*coord.x*.8+coord.y*coord.y*9.0)*3.0);
  float tail=step(coord.x,-.2)*step(abs(coord.y),(-coord.x-.18)*.45)*.35;
  glow=mix(glow,body+tail+exp(-d*d*3.0)*.10,vFish);
  gl_FragColor=vec4(vColor,glow*vAlpha);
}
`
