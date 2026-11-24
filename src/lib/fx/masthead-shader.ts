/**
 * Masthead background. Flow field and scene wipe adapted from a pen by Matthias Hurrle (@atzedent),
 * CodePen, MIT. Changes: Paper Design uniforms, output remapped to the brand blues (navy -> electric -> sky)
 * and held dark enough for white text, film grain on top, and a scale control for a short, wide band.
 */
export const mastheadShader = `#version 300 es
// mediump to match Paper's vertex shader (shared uniforms must agree); the hash stays highp so grain doesn't band
precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;

uniform vec4 u_navy;
uniform vec4 u_electric;
uniform vec4 u_sky;
uniform float u_scale;
uniform float u_intensity;
uniform float u_grain;

out vec4 fragColor;

#define S smoothstep
#define T (.112358 + u_time)

highp float rnd(highp vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 f = fract(p), i = floor(p);
  float a = rnd(i), b = rnd(i + vec2(1, 0)), c = rnd(i + vec2(0, 1)), d = rnd(i + vec2(1, 1));
  vec2 u = f * f * (3. - 2. * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1. - u.x) + (d - b) * u.y * u.x;
}

void main(void) {
  vec2 uv = (gl_FragCoord.xy - .5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
  uv *= u_scale;

  float t = T * .1;
  vec3 col = vec3(0);
  vec2 p = vec2(noise(uv + vec2(0, 1)), noise(uv + vec2(1, 0)));
  p = 8. * (vec2(sin(t), -cos(t)) * .15 - p);

  float s = .35;
  for (float i = 0.; i < 6.; i++) {
    p.x += s * sin(2. * t - i * 1.5 * p.y) + t;
    p.y += s * cos(2. * t + i * 1.5 * p.x) - t;
  }

  col += sin(t + p.x + p.y);
  col = pow(S(vec3(0), vec3(1), col), vec3(.4));

  // Scene wipe: alternates radial and cross transitions, inverting the field
  float stp = 2., prog = T * .2, anim = floor(mod(prog - .5, stp));
  prog -= anim == 0. ? length(uv) * .2 : min(abs(uv.x), abs(uv.y)) * .2;
  if (floor(mod(prog, stp)) == 0.) col = 1. - col;

  // Brand remap: luminance -> navy, electric, then a little sky at the peaks
  float l = dot(col, vec3(.299, .587, .114));
  vec3 brand = mix(u_navy.rgb, u_electric.rgb, S(.0, .85, l));
  brand = mix(brand, u_sky.rgb, S(.85, 1., l) * .5);
  brand = mix(u_navy.rgb, brand, u_intensity);

  // Film grain
  brand += (rnd(gl_FragCoord.xy + fract(u_time * 7.) * 91.7) - .5) * u_grain;

  fragColor = vec4(brand, 1.);
}
`

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).concat(1)

export const mastheadUniforms = {
  u_navy: hex("#0b1757"),
  u_electric: hex("#2747e6"),
  u_sky: hex("#9fb2ff"),
  u_scale: 0.32,
  u_intensity: 0.5,
  u_grain: 0.09,
}
