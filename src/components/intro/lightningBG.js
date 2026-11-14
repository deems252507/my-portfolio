// Petir ungu WebGL di kanvas offscreen. Shader sama dengan src/components/ui/Lightning.jsx
// (yang dipakai WelcomeScreen), jadi layar monitor dan layar tujuan terlihat identik.
// Kanvas ini dipakai dua kali: (1) sebagai isi layar monitor, (2) overlay layar-penuh saat kamera menembus layar.
const VERT = `attribute vec2 aPosition; void main(){ gl_Position = vec4(aPosition,0.0,1.0); }`;

const frag = (octaves) => `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 iResolution;
uniform float iTime;
uniform float uHue;
uniform float uSpeed;
uniform float uIntensity;
uniform float uSize;
uniform float uSpread;
#define OCTAVES ${octaves}
vec3 hsv2rgb(vec3 c){ vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0,0.0,1.0); return c.z*mix(vec3(1.0),rgb,c.y); }
float hash11(float p){ p=fract(p*.1031); p*=p+33.33; p*=p+p; return fract(p); }
float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float noise(vec2 p){
  vec2 ip=floor(p), fp=fract(p);
  float a=hash12(ip), b=hash12(ip+vec2(1.0,0.0)), c=hash12(ip+vec2(0.0,1.0)), d=hash12(ip+vec2(1.0,1.0));
  vec2 t=smoothstep(0.0,1.0,fp);
  return mix(mix(a,b,t.x),mix(c,d,t.x),t.y);
}
float fbm(vec2 p){
  float v=0.0, amp=0.5;
  for(int i=0;i<OCTAVES;++i){ v+=amp*noise(p); p*=rot(0.45); p*=2.0; amp*=0.5; }
  return v;
}
float bolt(vec2 uv0, float aspect, float off, float tOff, float seed){
  vec2 uv = uv0; uv.x += off;
  float T = iTime + tOff;
  float path = sin(uv.y*3.0 - T*2.5)*0.25 + sin(uv.y*5.0 + T*1.5)*0.15;
  float n = 2.0*fbm(uv*uSize*1.5 + 1.2*T*uSpeed + seed) - 1.0;
  float scale = aspect < 1.0 ? aspect*1.1 : 1.0;
  float center = (path + n*0.4)*scale;
  float dist = abs(uv.x - center);
  return mix(0.0,0.07,hash11(T*uSpeed)) / max(dist, 0.0009);
}
void main(){
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  uv = 2.0*uv - 1.0;
  float aspect = iResolution.x / iResolution.y;
  uv.x *= aspect;
  vec3 base = hsv2rgb(vec3(uHue/360.0, 0.7, 0.8));
  float b = bolt(uv, aspect, 0.0, 0.0, 0.0);
  if (uSpread > 0.001) {
    b += uSpread * 0.85 * bolt(uv, aspect, -0.75*aspect, 1.7, 11.3);
    b += uSpread * 0.85 * bolt(uv, aspect,  0.75*aspect, 3.1, 23.7);
    b += uSpread * 0.55 * bolt(uv, aspect, -1.45*aspect, 4.9, 37.1);
    b += uSpread * 0.55 * bolt(uv, aspect,  1.45*aspect, 6.3, 51.9);
  }
  vec3 col = base * b * uIntensity;
  // halo ungu lembut dari pusat saat petir memenuhi layar
  float r = length(uv / vec2(aspect, 1.0));
  col += base * uSpread * 0.28 * exp(-r*1.6);
  col = min(col, vec3(6.0));
  float alpha = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}`;

export class LightningBG {
  constructor({ hue = 270, speed = 1.4, intensity = 1.3, size = 2, compact = false } = {}) {
    this.hue = hue; this.speed = speed; this.intensity = intensity; this.size = size;
    this.ok = false;
    this.canvas = document.createElement("canvas");
    this.canvas.width = compact ? 480 : 960;
    this.canvas.height = compact ? 270 : 540;
    this.canvas.setAttribute("aria-hidden", "true");
    const gl = this.canvas.getContext("webgl", {
      antialias: false, alpha: true, premultipliedAlpha: true,
      preserveDrawingBuffer: true, powerPreference: "low-power",
    });
    if (!gl) return;
    this.gl = gl;
    const sh = (src, type) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
      return s;
    };
    const vs = sh(VERT, gl.VERTEX_SHADER);
    const fs = sh(frag(compact ? 4 : 7), gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return;
    gl.useProgram(p);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, "aPosition");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    ["iResolution", "iTime", "uHue", "uSpeed", "uIntensity", "uSize", "uSpread"].forEach((n) => { this.u[n] = gl.getUniformLocation(p, n); });
    this.program = p;
    this.ok = true;
  }

  setSize(w, h) {
    w = Math.max(2, Math.floor(w)); h = Math.max(2, Math.floor(h));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
  }

  /** time dalam detik; spread 0..1 = jumlah cabang petir tambahan yang memenuhi layar. */
  render(time, spread = 0) {
    if (!this.ok) return;
    const gl = this.gl, u = this.u;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform2f(u.iResolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(u.iTime, time);
    gl.uniform1f(u.uHue, this.hue);
    gl.uniform1f(u.uSpeed, this.speed);
    gl.uniform1f(u.uIntensity, this.intensity);
    gl.uniform1f(u.uSize, this.size);
    gl.uniform1f(u.uSpread, spread);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  dispose() {
    try { this.gl?.getExtension("WEBGL_lose_context")?.loseContext(); } catch { /* abaikan */ }
    this.canvas.remove();
  }
}
