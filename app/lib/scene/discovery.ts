// One quiet event per visit to the oasis. Small scroll reversals do not restart
// it; leaving the chapter rearms it. Uses the existing visibility-aware frame clock.
export function advanceDiscovery(age: number, progress: number, seconds: number) {
  if (progress < 0.55 || progress > 1.6) return 0
  if (progress < 0.74) return age
  return Math.min(16, age + Math.max(0, Math.min(seconds, 0.1)))
}

export const discoveryGLSL = /* glsl */ `
uniform float uDiscoveryTime;
float discoveryPresence() {
  return smoothstep(.72,.95,uProgress)*(1.0-smoothstep(1.10,1.40,uProgress));
}
vec2 discoveryCenter() {
  return vec2(mix(10.0,14.0,smoothstep(.7,1.4,uAspect)),-44.0);
}
// Height and its analytic x/z derivatives: the packet modifies the same traced
// surface and reflected sunlight as the wind waves. No emissive ring overlay.
vec3 discoveryRipple(vec2 p) {
  float presence=discoveryPresence();
  float age=uDiscoveryTime-3.8;
  if(presence<.001 || age<=0.0 || age>=11.0) return vec3(0.0);
  vec2 local=p-discoveryCenter();
  // A little directional shear breaks the perfect compass-drawn circle while
  // keeping the normal derivatives consistent with the displaced height.
  vec2 delta=vec2(local.x+.2*sin(local.y*.55),local.y*.96+.16*sin(local.x*.4));
  float radius=length(delta);
  float x=radius-age*1.55;
  float width=1.25+age*.12;
  float packet=exp(-x*x/(width*width));
  float phase=x*2.8;
  float amplitude=.19*mix(.6,1.0,smoothstep(.7,1.4,uAspect))*presence*smoothstep(0.0,.8,age)
    *exp(-age*.16)*(1.0-smoothstep(7.5,11.0,age));
  float h=cos(phase)*packet*amplitude;
  float gradient=(-2.8*sin(phase)-2.0*x/(width*width)*cos(phase))*packet*amplitude;
  vec2 radial=delta/max(radius,.001);
  vec2 slope=vec2(radial.x+radial.y*.064*cos(local.x*.4),radial.x*.11*cos(local.y*.55)+radial.y*.96);
  return vec3(h,gradient*slope);
}
`
