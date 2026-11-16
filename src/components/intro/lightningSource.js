// Petir ungu/biru yang SAMA dengan WelcomeBackground (shader disalin dari components/ui/Lightning.jsx).
// Dirender ke kanvas WebGL kecil milik intro, lalu digambar ke layar monitor 3D, sehingga
// tampilan di monitor identik dengan layar sambutan asli situs (hue/kecepatan/intensitas dari pengaturan admin).
const makeFrag = (octaves) => `
      precision mediump float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform float uHue;
      uniform float uXOffset;
      uniform float uSpeed;
      uniform float uIntensity;
      uniform float uSize;
      #define OCTAVE_COUNT ${octaves}
      vec3 hsv2rgb(vec3 c) {
          vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0,4.0,2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
          return c.z * mix(vec3(1.0), rgb, c.y);
      }
      float hash11(float p) {
          p = fract(p * .1031);
          p *= p + 33.33;
          p *= p + p;
          return fract(p);
      }
      float hash12(vec2 p) {
          vec3 p3 = fract(vec3(p.xyx) * .1031);
          p3 += dot(p3, p3.yzx + 33.33);
          return fract((p3.x + p3.y) * p3.z);
      }
      mat2 rotate2d(float theta) {
          float c = cos(theta);
          float s = sin(theta);
          return mat2(c, -s, s, c);
      }
      float noise(vec2 p) {
          vec2 ip = floor(p);
          vec2 fp = fract(p);
          float a = hash12(ip);
          float b = hash12(ip + vec2(1.0, 0.0));
          float c = hash12(ip + vec2(0.0, 1.0));
          float d = hash12(ip + vec2(1.0, 1.0));
          vec2 t = smoothstep(0.0, 1.0, fp);
          return mix(mix(a, b, t.x), mix(c, d, t.x), t.y);
      }
      float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          for (int i = 0; i < OCTAVE_COUNT; ++i) {
              value += amplitude * noise(p);
              p *= rotate2d(0.45);
              p *= 2.0;
              amplitude *= 0.5;
          }
          return value;
      }
      void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
        vec2 uv = fragCoord / iResolution.xy;
        uv = 2.0 * uv - 1.0;
        float aspect = iResolution.x / iResolution.y;
        uv.x *= aspect;
        uv.x += uXOffset;
          
          // 1. Alur Utama (Macroscopic Path)
          // Menggunakan gelombang sinus agar petir meliuk lembut seperti ular ke bawah
          float path = sin(uv.y * 3.0 - iTime * 2.5) * 0.25 
                     + sin(uv.y * 5.0 + iTime * 1.5) * 0.15;
          
          // 2. Detail Kasar (Microscopic Noise)
          // Menggunakan fbm untuk cabang dan pinggiran tajam khas petir
          vec2 noiseUv = uv * uSize * 1.5;
          float n = 2.0 * fbm(noiseUv + 1.2 * iTime * uSpeed) - 1.0;
          
        // Batasi lebar liukan pada layar portrait.
        float scale = aspect < 1.0 ? (aspect * 1.1) : 1.0;
        float center = (path + n * 0.4) * scale;
          
        uv.y += n * 0.2 * scale; // Sedikit distorsi vertikal
          float dist = abs(uv.x - center);
          
          vec3 baseColor = hsv2rgb(vec3(uHue / 360.0, 0.7, 0.8));
          vec3 col = baseColor * pow(mix(0.014, 0.056, mix(hash11(floor(iTime * uSpeed * 4.0)), hash11(floor(iTime * uSpeed * 4.0) + 1.0), smoothstep(0.0, 1.0, fract(iTime * uSpeed * 4.0)))) / dist, 1.0) * uIntensity;
          float alpha = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
          fragColor = vec4(col, alpha);
      }
      void main() {
          mainImage(gl_FragColor, gl_FragCoord.xy);
      }
    `;

export class LightningSource {
  constructor({ width = 1024, height = 470, hue = 220, speed = 1.6, intensity = 1.2, size = 2, octaves = 6, fps = 30 } = {}) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    this.hue = hue; this.speed = speed; this.intensity = intensity; this.size = size;
    this.minDt = 1 / fps;
    this.last = -1;
    this.ok = false;
    const gl = this.canvas.getContext("webgl", { antialias: false, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true, powerPreference: "low-power" });
    if (!gl) return;
    this.gl = gl;
    const sh = (src, type) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { gl.deleteShader(s); return null; }
      return s;
    };
    const vs = sh("attribute vec2 aPosition; void main(){ gl_Position = vec4(aPosition,0.0,1.0); }", gl.VERTEX_SHADER);
    const fs = sh(makeFrag(octaves), gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;
    const p = gl.createProgram();
    gl.attachShader(p, vs); gl.attachShader(p, fs); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) return;
    gl.useProgram(p);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, "aPosition");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {
      res: gl.getUniformLocation(p, "iResolution"), time: gl.getUniformLocation(p, "iTime"),
      hue: gl.getUniformLocation(p, "uHue"), x: gl.getUniformLocation(p, "uXOffset"),
      speed: gl.getUniformLocation(p, "uSpeed"), inten: gl.getUniformLocation(p, "uIntensity"),
      size: gl.getUniformLocation(p, "uSize"),
    };
    this.prog = p;
    this.ok = true;
  }

  /** Render satu frame (dibatasi ~30fps). boost mengalikan intensitas. */
  render(time, boost = 1) {
    if (!this.ok) return false;
    if (this.last >= 0 && time - this.last < this.minDt && boost === this._boost) return true;
    this.last = time; this._boost = boost;
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.u.res, this.canvas.width, this.canvas.height);
    gl.uniform1f(this.u.time, time);
    gl.uniform1f(this.u.hue, this.hue);
    gl.uniform1f(this.u.x, 0);
    gl.uniform1f(this.u.speed, this.speed);
    gl.uniform1f(this.u.inten, this.intensity * boost);
    gl.uniform1f(this.u.size, this.size);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    return true;
  }

  dispose() {
    try { this.gl?.getExtension("WEBGL_lose_context")?.loseContext(); } catch { /* abaikan */ }
    this.ok = false;
  }
}
