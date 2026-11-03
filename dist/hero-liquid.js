// Original procedural gradient and fluid distortion. The optional video comparison is local only.
function initLiquid(stage, canvas) {
  if (!stage || !canvas) return;
  const status = { set textContent(value) { canvas.dataset.status = value; } };
  const videoMode = false;
  const video = videoMode ? document.createElement('video') : null;
  if (videoMode) {
    video.src = 'top-kv.mp4';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'auto';
    document.getElementById('source-label').textContent = 'VIDEO × WEBGL2';
    document.getElementById('source-note').textContent = 'Vergleich mit dem lokalen Referenzvideo von GENEROSITY';
  }
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  if (reduceMotion.matches) {
    status.textContent = 'Bewegung reduziert';
    return;
  }

  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false });
  if (!gl || !gl.getExtension('EXT_color_buffer_float')) {
    status.textContent = 'Statische Ansicht (WebGL2 nicht verfügbar)';
    return;
  }

  const vertex = `#version 300 es
    precision highp float;
    out vec2 uv;
    void main() {
      vec2 pos = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
      uv = pos;
      gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
    }`;
  // A fullscreen triangle avoids seams and uses no vertex buffer.
  const base = `#version 300 es
    precision highp float;
    in vec2 uv;
    out vec4 outColor;
  `;

  const advectSource = base + `
    uniform sampler2D velocity;
    uniform vec2 pointer;
    uniform vec2 pointerFrom;
    uniform vec2 pointerDelta;
    uniform float aspect;
    uniform float pointerActive;
    void main() {
      vec2 at = fract(uv - texture(velocity, uv).xy / 38.0);
      vec2 flow = mix(texture(velocity, at).xy, texture(velocity, uv).xy, 0.28);
      float movement = length(pointerDelta);
      float radius = 0.19;
      float influence = 0.0;
      for (int i = 0; i < 6; i++) {
        vec2 center = mix(pointerFrom, pointer, float(i) / 5.0);
        vec2 diff = (uv - center) * vec2(aspect, 1.0);
        float distanceToPointer = length(diff);
        float forward = max(dot(diff / max(distanceToPointer, 0.0001), pointerDelta / max(movement, 0.0001)), 0.0);
        float normalizedDistance = distanceToPointer / radius;
        influence += forward / max(normalizedDistance * normalizedDistance, 0.01);
      }
      flow += pointerDelta * radius * (min(influence / 6.0, 14.0)) * pointerActive * 2.2;
      outColor = vec4(flow, 0.0, 1.0);
    }`;
  const divergenceSource = base + `
    uniform sampler2D velocity;
    uniform vec2 texel;
    void main() {
      float left  = texture(velocity, uv - vec2(texel.x, 0.0)).x;
      float right = texture(velocity, uv + vec2(texel.x, 0.0)).x;
      float down  = texture(velocity, uv - vec2(0.0, texel.y)).y;
      float up    = texture(velocity, uv + vec2(0.0, texel.y)).y;
      outColor = vec4(0.5 * (right - left + up - down), 0.0, 0.0, 1.0);
    }`;
  const pressureSource = base + `
    uniform sampler2D pressure;
    uniform sampler2D divergence;
    uniform vec2 texel;
    void main() {
      float left  = texture(pressure, uv - vec2(texel.x, 0.0)).x;
      float right = texture(pressure, uv + vec2(texel.x, 0.0)).x;
      float down  = texture(pressure, uv - vec2(0.0, texel.y)).x;
      float up    = texture(pressure, uv + vec2(0.0, texel.y)).x;
      float div = texture(divergence, uv).x;
      outColor = vec4((left + right + down + up - div) * 0.25, 0.0, 0.0, 1.0);
    }`;
  const projectSource = base + `
    uniform sampler2D velocity;
    uniform sampler2D pressure;
    uniform vec2 texel;
    void main() {
      float left  = texture(pressure, uv - vec2(texel.x, 0.0)).x;
      float right = texture(pressure, uv + vec2(texel.x, 0.0)).x;
      float down  = texture(pressure, uv - vec2(0.0, texel.y)).x;
      float up    = texture(pressure, uv + vec2(0.0, texel.y)).x;
      vec2 flow = texture(velocity, uv).xy - 0.5 * vec2(right - left, up - down);
      outColor = vec4(flow, 0.0, 1.0);
    }`;
  const generatedSource = base + `
    uniform float time;
    float waveRandom(float seed) {
      return fract(sin(seed * 127.1 + 78.233) * 43758.5453);
    }
    float smoothNoise(vec2 point) {
      vec2 cell = floor(point);
      vec2 blend = fract(point);
      blend = blend * blend * (3.0 - 2.0 * blend);
      float a = waveRandom(dot(cell, vec2(127.1, 311.7)));
      float b = waveRandom(dot(cell + vec2(1.0, 0.0), vec2(127.1, 311.7)));
      float c = waveRandom(dot(cell + vec2(0.0, 1.0), vec2(127.1, 311.7)));
      float d = waveRandom(dot(cell + vec2(1.0, 1.0), vec2(127.1, 311.7)));
      return mix(mix(a, b, blend.x), mix(c, d, blend.x), blend.y);
    }
    vec3 lightWave(vec2 p, float phase, float seed) {
      float progress = clamp(phase, 0.0, 1.0);
      float cycle = progress * 6.2831853;
      float shape = waveRandom(seed + 1.0) * 2.0 - 1.0;
      float spread = 0.87 + 0.26 * waveRandom(seed + 2.0);
      vec2 center = phase < 0.0
        ? vec2(0.98 - 0.45 * phase, 0.70 - 0.18 * phase)
        : vec2(0.98 - 1.35 * phase, 0.70 - 0.25 * phase);
      center += vec2(0.045 * shape + 0.065 * (smoothNoise(vec2(time * 0.24, seed * 0.67 + 1.0)) - 0.5),
                     0.045 * shape + 0.085 * (smoothNoise(vec2(time * 0.18, seed * 0.79 + 4.0)) - 0.5));
      vec2 fromCenter = p - center;
      float middleBloom = exp(-pow((progress - (0.49 + 0.045 * shape)) / 0.24, 2.0));
      float width = mix(0.14, 0.035, pow(progress, 0.82)) + 0.25 * middleBloom * spread;
      float extent = mix(1.65, 0.70, pow(progress, 0.86)) + 0.90 * middleBloom * spread;
      float along = fromCenter.x - fromCenter.y * 0.88;
      float across = fromCenter.y + fromCenter.x * 0.88;
      float broadBend = smoothNoise(vec2(along * 2.2 + seed * 1.8, time * 0.24));
      float fineBend = smoothNoise(vec2(along * 4.8 - seed * 1.3, time * 0.32 + 7.0));
      across += width * (0.55 * (broadBend - 0.5) + 0.16 * (fineBend - 0.5));
      float envelope = exp(-pow(along / extent, 2.0));
      float sweep = mix(1.0, 0.72, progress) * envelope;

      // The secondary ribbon slips right, narrows, then dissolves there instead of snapping back.
      float ribbonEscape = smoothstep(0.60, 0.82, progress);
      float dissolve = smoothstep(0.76, 0.96, progress);
      vec2 pinkCenter = vec2(
        mix(center.x, 0.38 + 0.55 * (progress - 0.60), ribbonEscape),
        center.y - 0.025 * ribbonEscape
      );
      vec2 pinkFromCenter = p - pinkCenter;
      float pinkAlong = pinkFromCenter.x - pinkFromCenter.y * 0.88;
      float pinkAcross = pinkFromCenter.y + pinkFromCenter.x * 0.88;
      float ribbonBend = smoothNoise(vec2(pinkAlong * 2.7 + seed * 2.4 + 11.0, time * 0.27));
      pinkAcross += width * 0.60 * (ribbonBend - 0.5);
      float pinkWidth = width * (0.90 + 0.18 * waveRandom(seed + 3.0))
                      * (1.0 - 0.58 * ribbonEscape + 0.20 * dissolve);
      float pinkSweep = mix(1.0, 0.82, progress)
                      * (1.0 - dissolve)
                      * exp(-pow(pinkAlong / (extent * (1.0 - 0.38 * ribbonEscape + 0.20 * dissolve)), 2.0));

      // Broad color fields and narrow ribbons are separate, softly overlapping layers.
      float haze = exp(-pow(across / (width * 2.1), 2.0));
      float lowerRibbon = exp(-pow((pinkAcross + pinkWidth * (0.82 + 0.17 * sin(cycle * 1.3 + seed * 1.1))) / (pinkWidth * 0.95), 2.0));
      float upperRibbon = exp(-pow((across - width * 0.15 * (fineBend - 0.5) - width * (0.95 + 0.17 * sin(cycle * 0.9 + seed * 1.9))) / (width * 1.05), 2.0));
      float darkChannel = exp(-pow((across + width * 0.23 * (broadBend - 0.5) - width * (0.10 + 0.16 * sin(cycle * 1.25 + seed * 2.4))) / (width * 0.38), 2.0));
      float lightRim = exp(-pow((across - width * 0.27 * (fineBend - 0.5) - width * (0.52 + 0.18 * sin(cycle * 1.6 + seed * 1.3))) / (width * 0.23), 2.0));
      float secondRim = exp(-pow((pinkAcross + pinkWidth * (0.78 + 0.18 * sin(cycle * 1.1 + seed * 2.8))) / (pinkWidth * 0.30), 2.0));

      vec3 color = vec3(0.065, 0.016, 0.13) * haze * 0.32;
      color += vec3(0.18, 0.055, 0.30) * upperRibbon * 0.72;
      color -= vec3(0.12, 0.045, 0.22) * darkChannel * 0.95;
      color += vec3(0.28, 0.19, 0.43) * lightRim * 0.74;
      vec3 pink = vec3(0.11, 0.035, 0.23) * lowerRibbon * 0.54;
      pink += vec3(0.16, 0.09, 0.31) * secondRim * 0.46;
      return max(color, vec3(0.0)) * sweep + pink * pinkSweep;
    }
    void main() {
      vec2 p = uv;
      float progress = fract(time / 6.5);
      float seed = floor(time / 6.5);

      // The next wave enters while the old ribbons still overlap, so the loop never goes dark.
      float outgoing = 1.0 - smoothstep(0.84, 1.0, progress);
      float incoming = smoothstep(0.58, 0.91, progress);
      vec3 light = lightWave(p, progress, seed) * outgoing;
      if (progress > 0.58) {
        light += lightWave(p, progress - 1.0, seed + 1.0) * incoming;
      }
      float ambient = exp(-pow((p.y + 0.32 * p.x
                        - (0.50 + 0.08 * sin(progress * 6.2831853))) / 0.72, 2.0));
      vec3 foundation = vec3(0.027, 0.010, 0.060)
                      + vec3(0.040, 0.012, 0.080) * ambient;
      vec3 color = clamp(foundation + light, 0.0, 1.0);
      outColor = vec4(color, 1.0);
    }`;
  const displaySource = base + `
    uniform sampler2D velocity;
    uniform sampler2D sourceFrame;
    uniform vec2 canvasSize;
    uniform vec2 sourceSize;
    uniform float videoMode;
    void main() {
      vec2 flow = texture(velocity, uv).xy * 1.45;
      vec2 sampleUv = uv - flow;
      float canvasAspect = canvasSize.x / canvasSize.y;
      if (videoMode > 0.5) {
        float sourceAspect = sourceSize.x / sourceSize.y;
        if (canvasAspect > sourceAspect) {
          sampleUv.y = (sampleUv.y - 0.5) * sourceAspect / canvasAspect + 0.5;
        } else {
          sampleUv.x = (sampleUv.x - 0.5) * canvasAspect / sourceAspect + 0.5;
        }
      }
      vec3 color = texture(sourceFrame, clamp(sampleUv, 0.001, 0.999)).rgb;
      if (videoMode > 0.5) {
        float lightness = dot(color, vec3(0.299, 0.587, 0.114));
        color = mix(vec3(0.018, 0.006, 0.064), vec3(0.34, 0.075, 0.64), smoothstep(0.02, 0.43, lightness));
        color = mix(color, vec3(0.84, 0.56, 1.0), smoothstep(0.42, 0.82, lightness));
      }
      outColor = vec4(color, 1.0);
    }`;

  function shader(type, source) {
    const item = gl.createShader(type);
    gl.shaderSource(item, source);
    gl.compileShader(item);
    if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(item));
    }
    return item;
  }
  function program(fragment) {
    const item = gl.createProgram();
    gl.attachShader(item, shader(gl.VERTEX_SHADER, vertex));
    gl.attachShader(item, shader(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(item);
    if (!gl.getProgramParameter(item, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(item));
    }
    return item;
  }
  function target(width, height, filter) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error('Floating-point framebuffer unavailable');
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { texture, framebuffer, width, height };
  }
  function dispose(item) {
    if (!item) return;
    gl.deleteTexture(item.texture);
    gl.deleteFramebuffer(item.framebuffer);
  }
  function pass(effect, destination, inputs, values = {}) {
    gl.useProgram(effect);
    gl.bindFramebuffer(gl.FRAMEBUFFER, destination ? destination.framebuffer : null);
    gl.viewport(0, 0, destination ? destination.width : canvas.width, destination ? destination.height : canvas.height);
    let unit = 0;
    for (const [name, texture] of Object.entries(inputs)) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(gl.getUniformLocation(effect, name), unit++);
    }
    for (const [name, value] of Object.entries(values)) {
      const location = gl.getUniformLocation(effect, name);
      if (location === null) continue;
      if (Array.isArray(value)) gl.uniform2f(location, value[0], value[1]);
      else gl.uniform1f(location, value);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  let effects;
  let videoTexture, generated;
  let flowA, flowB, divergence, pressureA, pressureB;
  let simWidth = 0, simHeight = 0;
  const pointer = { x: 0.5, y: 0.5, frameX: 0.5, frameY: 0.5, smoothX: 0, smoothY: 0, active: 0, previous: false };
  let lastPointerAt = 0;
  let running = true;

  try {
    effects = {
      advect: program(advectSource),
      divergence: program(divergenceSource),
      pressure: program(pressureSource),
      project: program(projectSource),
      generated: program(generatedSource),
      display: program(displaySource),
    };
    if (videoMode) {
      videoTexture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, videoTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    }
  } catch (error) {
    console.error('Liquid gradient setup failed:', error);
    status.textContent = 'Grafik nicht verfügbar';
    return;
  }

  function resize() {
    const bounds = stage.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.max(1, Math.round(bounds.width * dpr));
    const height = Math.max(1, Math.round(bounds.height * dpr));
    if (canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    const scale = Math.min(0.35, 420 / bounds.width);
    simWidth = Math.max(1, Math.round(bounds.width * scale));
    simHeight = Math.max(1, Math.round(bounds.height * scale));
    [flowA, flowB, divergence, pressureA, pressureB, generated].forEach(dispose);
    const filter = gl.getExtension('OES_texture_float_linear') ? gl.LINEAR : gl.NEAREST;
    flowA = target(simWidth, simHeight, filter);
    flowB = target(simWidth, simHeight, filter);
    divergence = target(simWidth, simHeight, gl.NEAREST);
    pressureA = target(simWidth, simHeight, gl.NEAREST);
    pressureB = target(simWidth, simHeight, gl.NEAREST);
    if (!videoMode) generated = target(Math.min(1200, Math.max(1, Math.round(bounds.width * 0.8))), Math.min(675, Math.max(1, Math.round(bounds.height * 0.8))), filter);
  }

  stage.addEventListener('pointermove', (event) => {
    const bounds = stage.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const y = Math.max(0, Math.min(1, 1 - (event.clientY - bounds.top) / bounds.height));
    if (!pointer.previous) {
      pointer.frameX = x;
      pointer.frameY = y;
    }
    pointer.x = x;
    pointer.y = y;
    pointer.previous = true;
    pointer.active = 1;
    lastPointerAt = performance.now();
  }, { passive: true });
  stage.addEventListener('pointerleave', () => { pointer.previous = false; pointer.active = 0; });
  let resizePending = true;
  const sphere = stage.id === 'app' ? stage.querySelector('.sphere-frame') : null;
  function updateSphereMask() {
    if (!sphere) return;
    const sectionBounds = stage.getBoundingClientRect();
    const sphereBounds = sphere.getBoundingClientRect();
    canvas.style.setProperty('--sphere-y', `${sphereBounds.top - sectionBounds.top + sphereBounds.height / 2}px`);
    canvas.style.setProperty('--sphere-rx', `${sphereBounds.width * .72}px`);
    canvas.style.setProperty('--sphere-ry', `${sphereBounds.height * .68}px`);
  }
  const sizeObserver = new ResizeObserver(() => { resizePending = true; updateSphereMask(); });
  sizeObserver.observe(stage);
  if (sphere) sizeObserver.observe(sphere);
  let previousFrame = 0;
  let liquidTime = 0;
  let heroVisible = false;
  let frameId = null;
  const visibilityTarget = stage.closest('.wh-hero') || stage;
  function syncPlayback() {
    const active = heroVisible && !document.hidden && !reduceMotion.matches && running;
    canvas.dataset.rendering = active ? 'active' : 'paused';
    if (active && frameId === null) {
      previousFrame = 0;
      frameId = requestAnimationFrame(frame);
    } else if (!active && frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
    if (video) {
      if (active) video.play().catch(() => {});
      else video.pause();
    }
    if (!active) { pointer.previous = false; pointer.active = 0; }
  }
  document.addEventListener('visibilitychange', syncPlayback);
  reduceMotion.addEventListener('change', syncPlayback);
  new IntersectionObserver(([entry]) => {
    heroVisible = entry.isIntersecting;
    syncPlayback();
  }).observe(visibilityTarget);
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault(); running = false; stage.classList.remove('is-ready');
  });
  function frame(now) {
    frameId = null;
    if (!running || !heroVisible || document.hidden || reduceMotion.matches) return;
    frameId = requestAnimationFrame(frame);
    if (now - previousFrame < 1000 / 30) return;
    const elapsed = Math.min((now - previousFrame) / 1000, 0.08);
    previousFrame = now;
    if (!heroVisible || reduceMotion.matches || document.querySelector('.wh-pause')?.dataset.paused === '1') return;
    if (document.hidden || (video && video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA)) return;
    liquidTime += elapsed;
    try {
      if (resizePending) { resize(); resizePending = false; }
      if (video) {
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.bindTexture(gl.TEXTURE_2D, videoTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      } else {
        pass(effects.generated, generated, {}, { time: liquidTime });
      }
      const aspect = canvas.width / canvas.height;
      const texel = [1 / simWidth, 1 / simHeight];
      const recentMove = now - lastPointerAt < 95 && pointer.active;
      const rawDelta = recentMove ? [(pointer.x - pointer.frameX) * aspect, pointer.y - pointer.frameY] : [0, 0];
      const motion = Math.hypot(...rawDelta);
      const factor = Math.min(1, 0.022 / Math.max(motion, 0.0001));
      const targetX = rawDelta[0] * factor;
      const targetY = rawDelta[1] * factor;
      pointer.smoothX += (targetX - pointer.smoothX) * (recentMove ? 0.38 : 0.14);
      pointer.smoothY += (targetY - pointer.smoothY) * (recentMove ? 0.38 : 0.14);
      const delta = [pointer.smoothX, pointer.smoothY];
      if (now - lastPointerAt > 550) pointer.active = 0;
      pass(effects.advect, flowB, { velocity: flowA.texture }, {
        pointer: [pointer.x, pointer.y], pointerFrom: [pointer.frameX, pointer.frameY], pointerDelta: delta,
        aspect, pointerActive: Math.min(1, Math.hypot(...delta) * 180),
      });
      pointer.frameX = pointer.x;
      pointer.frameY = pointer.y;
      pass(effects.divergence, divergence, { velocity: flowB.texture }, { texel });
      for (let i = 0; i < 20; i++) {
        pass(effects.pressure, pressureB, { pressure: pressureA.texture, divergence: divergence.texture }, { texel });
        [pressureA, pressureB] = [pressureB, pressureA];
      }
      pass(effects.project, flowA, { velocity: flowB.texture, pressure: pressureA.texture }, { texel });
      pass(effects.display, null, { velocity: flowA.texture, sourceFrame: video ? videoTexture : generated.texture }, {
        canvasSize: [canvas.width, canvas.height],
        sourceSize: video ? [video.videoWidth, video.videoHeight] : [generated.width, generated.height],
        videoMode: video ? 1 : 0,
      });
      if (!stage.classList.contains('is-ready')) {
        stage.classList.add('is-ready');
        status.textContent = 'Interaktiv · Maus bewegen';
      }
    } catch (error) {
      console.error('Liquid gradient render failed:', error);
      running = false;
      stage.classList.remove('is-ready');
      status.textContent = 'Grafik nicht verfügbar';
    }
  }
  if (video) {
    video.addEventListener('error', () => { status.textContent = 'Video konnte nicht geladen werden'; });
    video.play().catch(() => { status.textContent = 'Zum Starten tippen'; });
    stage.addEventListener('pointerdown', () => { video.play().catch(() => {}); }, { once: true });
  }
}
// Allocate shader resources only when each section first becomes visible.
for (const [stage, canvas] of [
  [document.querySelector('.wh-stage'), document.getElementById('liquid-canvas')],
  [document.getElementById('app'), document.getElementById('ai-liquid-canvas')],
]) {
  if (!stage || !canvas) continue;
  canvas.dataset.rendering = 'idle';
  const target = stage.closest('.wh-hero') || stage;
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    initLiquid(stage, canvas);
  });
  observer.observe(target);
}
