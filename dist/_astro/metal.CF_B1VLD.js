function e(e){let t=e.replace(`#`,``);(t.length===3||t.length===4)&&(t=t.split(``).map(e=>e+e).join(``));let n=t.length>=8?parseInt(t.slice(6,8),16)/255:1;return[parseInt(t.slice(0,2),16)/255,parseInt(t.slice(2,4),16)/255,parseInt(t.slice(4,6),16)/255,n]}function t(e,t,n){e/=255,t/=255,n/=255;let r=Math.max(e,t,n),i=r-Math.min(e,t,n),a=0,o=r===0?0:i/r;return i!==0&&(a=r===e?((t-n)/i+6)%6:r===t?(n-e)/i+2:(e-t)/i+4,a/=6),[a,o,r]}function n(e,t,n){let r=Math.floor(e*6),i=e*6-r,a=n*(1-t),o=n*(1-i*t),s=n*(1-(1-i)*t),c=0,l=0,u=0;switch(r%6){case 0:c=n,l=s,u=a;break;case 1:c=o,l=n,u=a;break;case 2:c=a,l=n,u=s;break;case 3:c=a,l=o,u=n;break;case 4:c=s,l=a,u=n;break;case 5:c=n,l=a,u=o}return[Math.round(c*255),Math.round(l*255),Math.round(u*255)]}var r={colorBack:`#00000000`,speed:1,repetition:1.5,softness:.05,shiftRed:.3,shiftBlue:.3,distortion:.1,contour:.4,angle:90,shape:0,scale:1,rotation:0,offsetX:0,offsetY:0,originX:.5,originY:.5,worldWidth:0,worldHeight:0,fit:1},i={chromatic:{name:`chromatic`,modes:{dark:{...r,colorTint:`#88ccff2e`,shiftRed:.75,shiftBlue:.75,repetition:2,softness:.09,shaderOpacity:1},light:{...r,colorTint:`#66b0ff99`,shiftRed:.6,shiftBlue:.6,shaderOpacity:1}}},silver:{name:`silver`,modes:{dark:{...r,colorTint:`#ffffff66`,shaderOpacity:.88},light:{...r,colorTint:`#ffffff40`,shaderOpacity:1}}},gold:{name:`gold`,modes:{dark:{...r,colorTint:`#ffcc55cc`,speed:.85,shaderOpacity:.92},light:{...r,colorTint:`#f7d488aa`,shaderOpacity:1}}}},a=`#version 300 es
precision mediump float;

uniform sampler2D u_image;
uniform float u_imageAspectRatio;

uniform vec2 u_resolution;
uniform float u_time;

uniform vec4 u_colorBack;
uniform vec4 u_colorTint;

uniform float u_softness;
uniform float u_repetition;
uniform float u_shiftRed;
uniform float u_shiftBlue;
uniform float u_distortion;
uniform float u_contour;
uniform float u_angle;

uniform float u_shape;
uniform bool u_isImage;

in vec2 v_objectUV;
in vec2 v_responsiveUV;
in vec2 v_responsiveBoxGivenSize;
in vec2 v_imageUV;

out vec4 fragColor;


#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846


vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}


vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
      dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}


float getColorChanges(float c1, float c2, float stripe_p, vec3 w, float blur, float bump, float tint) {

  float ch = mix(c2, c1, smoothstep(.0, 2. * blur, stripe_p));

  float border = w[0];
  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));

  if (u_isImage == true) {
    bump = smoothstep(.2, .8, bump);
  }
  border = w[0] + .4 * (1. - bump) * w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));

  border = w[0] + .5 * (1. - bump) * w[1];
  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));

  border = w[0] + w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));

  float gradient_t = (stripe_p - w[0] - w[1]) / w[2];
  float gradient = mix(c1, c2, smoothstep(0., 1., gradient_t));
  ch = mix(ch, gradient, smoothstep(border, border + .5 * blur, stripe_p));

  // Tint color is applied with color burn blending
  ch = mix(ch, 1. - min(1., (1. - ch) / max(tint, 0.0001)), u_colorTint.a);
  return ch;
}

float getImgFrame(vec2 uv, float th) {
  float frame = 1.;
  frame *= smoothstep(0., th, uv.y);
  frame *= 1.0 - smoothstep(1. - th, 1., uv.y);
  frame *= smoothstep(0., th, uv.x);
  frame *= 1.0 - smoothstep(1. - th, 1., uv.x);
  return frame;
}

float blurEdge3x3(sampler2D tex, vec2 uv, vec2 dudx, vec2 dudy, float radius, float centerSample) {
  vec2 texel = 1.0 / vec2(textureSize(tex, 0));
  vec2 r = radius * texel;

  float w1 = 1.0, w2 = 2.0, w4 = 4.0;
  float norm = 16.0;
  float sum = w4 * centerSample;

  sum += w2 * textureGrad(tex, uv + vec2(0.0, -r.y), dudx, dudy).r;
  sum += w2 * textureGrad(tex, uv + vec2(0.0, r.y), dudx, dudy).r;
  sum += w2 * textureGrad(tex, uv + vec2(-r.x, 0.0), dudx, dudy).r;
  sum += w2 * textureGrad(tex, uv + vec2(r.x, 0.0), dudx, dudy).r;

  sum += w1 * textureGrad(tex, uv + vec2(-r.x, -r.y), dudx, dudy).r;
  sum += w1 * textureGrad(tex, uv + vec2(r.x, -r.y), dudx, dudy).r;
  sum += w1 * textureGrad(tex, uv + vec2(-r.x, r.y), dudx, dudy).r;
  sum += w1 * textureGrad(tex, uv + vec2(r.x, r.y), dudx, dudy).r;

  return sum / norm;
}

float lst(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

void main() {

  const float firstFrameOffset = 2.8;
  float t = .3 * (u_time + firstFrameOffset);

  vec2 uv = v_imageUV;
  vec2 dudx = dFdx(v_imageUV);
  vec2 dudy = dFdy(v_imageUV);
  vec4 img = textureGrad(u_image, uv, dudx, dudy);

  if (u_isImage == false) {
    uv = v_objectUV + .5;
    uv.y = 1. - uv.y;
  }

  float cycleWidth = u_repetition;
  float edge = 0.;
  float contOffset = 1.;

  vec2 rotatedUV = uv - vec2(.5);
  float angle = (-u_angle + 70.) * PI / 180.;
  float cosA = cos(angle);
  float sinA = sin(angle);
  rotatedUV = vec2(
  rotatedUV.x * cosA - rotatedUV.y * sinA,
  rotatedUV.x * sinA + rotatedUV.y * cosA
  ) + vec2(.5);

  if (u_isImage == true) {
    float edgeRaw = img.r;
    edge = blurEdge3x3(u_image, uv, dudx, dudy, 6., edgeRaw);
    edge = pow(edge, 1.6);
    edge *= mix(0.0, 1.0, smoothstep(0.0, 0.4, u_contour));
  } else {
    if (u_shape < 1.) {
      // full-fill on canvas
      vec2 borderUV = v_responsiveUV + .5;
      float ratio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
      vec2 mask = min(borderUV, 1. - borderUV);
      vec2 pixel_thickness = min(250. / v_responsiveBoxGivenSize, vec2(.5));
      float maskX = smoothstep(0.0, pixel_thickness.x, mask.x);
      float maskY = smoothstep(0.0, pixel_thickness.y, mask.y);
      maskX = pow(maskX, .25);
      maskY = pow(maskY, .25);
      edge = clamp(1. - maskX * maskY, 0., 1.);

      uv = v_responsiveUV;
      if (ratio > 1.) {
        uv.y /= ratio;
      } else {
        uv.x *= ratio;
      }
      uv += .5;
      uv.y = 1. - uv.y;

      cycleWidth *= 2.;
      contOffset = 1.5;

    } else if (u_shape < 2.) {
      // circle
      vec2 shapeUV = uv - .5;
      shapeUV *= .67;
      edge = pow(clamp(3. * length(shapeUV), 0., 1.), 18.);
    } else if (u_shape < 3.) {
      // daisy
      vec2 shapeUV = uv - .5;
      shapeUV *= 1.68;

      float r = length(shapeUV) * 2.;
      float a = atan(shapeUV.y, shapeUV.x) + .2;
      r *= (1. + .05 * sin(3. * a + 2. * t));
      float f = abs(cos(a * 3.));
      edge = smoothstep(f, f + .7, r);
      edge *= edge;

      uv *= .8;
      cycleWidth *= 1.6;

    } else if (u_shape < 4.) {
      // diamond
      vec2 shapeUV = uv - .5;
      shapeUV = rotate(shapeUV, .25 * PI);
      shapeUV *= 1.42;
      shapeUV += .5;
      vec2 mask = min(shapeUV, 1. - shapeUV);
      vec2 pixel_thickness = vec2(.15);
      float maskX = smoothstep(0.0, pixel_thickness.x, mask.x);
      float maskY = smoothstep(0.0, pixel_thickness.y, mask.y);
      maskX = pow(maskX, .25);
      maskY = pow(maskY, .25);
      edge = clamp(1. - maskX * maskY, 0., 1.);
    } else if (u_shape < 5.) {
      // metaballs
      vec2 shapeUV = uv - .5;
      shapeUV *= 1.3;
      edge = 0.;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float speed = 1.5 + 2./3. * sin(fi * 12.345);
        float angle = -fi * 1.5;
        vec2 dir1 = vec2(cos(angle), sin(angle));
        vec2 dir2 = vec2(cos(angle + 1.57), sin(angle + 1.));
        vec2 traj = .4 * (dir1 * sin(t * speed + fi * 1.23) + dir2 * cos(t * (speed * 0.7) + fi * 2.17));
        float d = length(shapeUV + traj);
        edge += pow(1.0 - clamp(d, 0.0, 1.0), 4.0);
      }
      edge = 1. - smoothstep(.65, .9, edge);
      edge = pow(edge, 4.);
    }

    edge = mix(smoothstep(.9 - 2. * fwidth(edge), .9, edge), edge, smoothstep(0.0, 0.4, u_contour));

  }

  float opacity = 0.;
  if (u_isImage == true) {
    opacity = img.g;
    float frame = getImgFrame(v_imageUV, 0.);
    opacity *= frame;
  } else {
    opacity = 1. - smoothstep(.9 - 2. * fwidth(edge), .9, edge);
    if (u_shape < 2.) {
      edge = 1.2 * edge;
    } else if (u_shape < 5.) {
      edge = 1.8 * pow(edge, 1.5);
    }
  }

  float diagBLtoTR = rotatedUV.x - rotatedUV.y;
  float diagTLtoBR = rotatedUV.x + rotatedUV.y;

  vec3 color = vec3(0.);
  vec3 color1 = vec3(.98, 0.98, 1.);
  vec3 color2 = vec3(.1, .1, .1 + .1 * smoothstep(.7, 1.3, diagTLtoBR));

  vec2 grad_uv = uv - .5;

  float dist = length(grad_uv + vec2(0., .2 * diagBLtoTR));
  grad_uv = rotate(grad_uv, (.25 - .2 * diagBLtoTR) * PI);
  float direction = grad_uv.x;

  float bump = pow(1.8 * dist, 1.2);
  bump = 1. - bump;
  bump *= pow(uv.y, .3);


  float thin_strip_1_ratio = .12 / cycleWidth * (1. - .4 * bump);
  float thin_strip_2_ratio = .07 / cycleWidth * (1. + .4 * bump);
  float wide_strip_ratio = (1. - thin_strip_1_ratio - thin_strip_2_ratio);

  float thin_strip_1_width = cycleWidth * thin_strip_1_ratio;
  float thin_strip_2_width = cycleWidth * thin_strip_2_ratio;

  float noise = snoise(uv - t);

  edge += (1. - edge) * u_distortion * noise;

  direction += diagBLtoTR;
  float contour = 0.;
  direction -= 2. * noise * diagBLtoTR * (smoothstep(0., 1., edge) * (1.0 - smoothstep(0., 1., edge)));
  direction *= mix(1., 1. - edge, smoothstep(.5, 1., u_contour));
  direction -= 1.7 * edge * smoothstep(.5, 1., u_contour);
  direction += .2 * pow(u_contour, 4.) * (1.0 - smoothstep(0., 1., edge));

  bump *= clamp(pow(uv.y, .1), .3, 1.);
  direction *= (.1 + (1.1 - edge) * bump);

  direction *= (.4 + .6 * (1.0 - smoothstep(.5, 1., edge)));
  direction += .18 * (smoothstep(.1, .2, uv.y) * (1.0 - smoothstep(.2, .4, uv.y)));
  direction += .03 * (smoothstep(.1, .2, 1. - uv.y) * (1.0 - smoothstep(.2, .4, 1. - uv.y)));

  direction *= (.5 + .5 * pow(uv.y, 2.));
  direction *= cycleWidth;
  direction -= t;


  float colorDispersion = (1. - bump);
  colorDispersion = clamp(colorDispersion, 0., 1.);
  float dispersionRed = colorDispersion;
  dispersionRed += .03 * bump * noise;
  dispersionRed += 5. * (smoothstep(-.1, .2, uv.y) * (1.0 - smoothstep(.1, .5, uv.y))) * (smoothstep(.4, .6, bump) * (1.0 - smoothstep(.4, 1., bump)));
  dispersionRed -= diagBLtoTR;

  float dispersionBlue = colorDispersion;
  dispersionBlue *= 1.3;
  dispersionBlue += (smoothstep(0., .4, uv.y) * (1.0 - smoothstep(.1, .8, uv.y))) * (smoothstep(.4, .6, bump) * (1.0 - smoothstep(.4, .8, bump)));
  dispersionBlue -= .2 * edge;

  dispersionRed *= (u_shiftRed / 20.);
  dispersionBlue *= (u_shiftBlue / 20.);

  float blur = 0.;
  float rExtraBlur = 0.;
  float gExtraBlur = 0.;
  if (u_isImage == true) {
    float softness = 0.05 * u_softness;
    blur = softness + .5 * smoothstep(1., 10., u_repetition) * smoothstep(.0, 1., edge);
    float smallCanvasT = 1.0 - smoothstep(100., 500., min(u_resolution.x, u_resolution.y));
    blur += smallCanvasT * smoothstep(.0, 1., edge);
    rExtraBlur = softness * (0.05 + .1 * (u_shiftRed / 20.) * bump);
    gExtraBlur = softness * 0.05 / max(0.001, abs(1. - diagBLtoTR));
  } else {
    blur = u_softness / 15. + .3 * contour;
  }

  vec3 w = vec3(thin_strip_1_width, thin_strip_2_width, wide_strip_ratio);
  w[1] -= .02 * smoothstep(.0, 1., edge + bump);
  float stripe_r = fract(direction + dispersionRed);
  float r = getColorChanges(color1.r, color2.r, stripe_r, w, blur + fwidth(stripe_r) + rExtraBlur, bump, u_colorTint.r);
  float stripe_g = fract(direction);
  float g = getColorChanges(color1.g, color2.g, stripe_g, w, blur + fwidth(stripe_g) + gExtraBlur, bump, u_colorTint.g);
  float stripe_b = fract(direction - dispersionBlue);
  float b = getColorChanges(color1.b, color2.b, stripe_b, w, blur + fwidth(stripe_b), bump, u_colorTint.b);

  color = vec3(r, g, b);
  color *= opacity;

  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  color = color + bgColor * (1. - opacity);
  opacity = opacity + u_colorBack.a * (1. - opacity);

  
  color += 1. / 256. * (fract(sin(dot(.014 * gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453123) - .5);


  fragColor = vec4(color, opacity);
}
`,o=`#version 300 es
precision mediump float;

layout(location = 0) in vec4 a_position;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_imageAspectRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform float u_fit;
uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

out vec2 v_objectUV;
out vec2 v_objectBoxSize;
out vec2 v_responsiveUV;
out vec2 v_responsiveBoxGivenSize;
out vec2 v_patternUV;
out vec2 v_patternBoxSize;
out vec2 v_imageUV;

vec3 getBoxSize(float boxRatio, vec2 givenBoxSize) {
  vec2 box = vec2(0.);
  // fit = none
  box.x = boxRatio * min(givenBoxSize.x / boxRatio, givenBoxSize.y);
  float noFitBoxWidth = box.x;
  if (u_fit == 1.) { // fit = contain
    box.x = boxRatio * min(u_resolution.x / boxRatio, u_resolution.y);
  } else if (u_fit == 2.) { // fit = cover
    box.x = boxRatio * max(u_resolution.x / boxRatio, u_resolution.y);
  }
  box.y = box.x / boxRatio;
  return vec3(box, noFitBoxWidth);
}

void main() {
  gl_Position = a_position;

  vec2 uv = gl_Position.xy * .5;
  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  float r = u_rotation * 3.14159265358979323846 / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);


  // ===================================================

  float fixedRatio = 1.;
  vec2 fixedRatioBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );

  v_objectBoxSize = getBoxSize(fixedRatio, fixedRatioBoxGivenSize).xy;
  vec2 objectWorldScale = u_resolution.xy / v_objectBoxSize;

  v_objectUV = uv;
  v_objectUV *= objectWorldScale;
  v_objectUV += boxOrigin * (objectWorldScale - 1.);
  v_objectUV += graphicOffset;
  v_objectUV /= u_scale;
  v_objectUV = graphicRotation * v_objectUV;

  // ===================================================

  v_responsiveBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  float responsiveRatio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
  vec2 responsiveBoxSize = getBoxSize(responsiveRatio, v_responsiveBoxGivenSize).xy;
  vec2 responsiveBoxScale = u_resolution.xy / responsiveBoxSize;

  v_responsiveUV = uv;
  v_responsiveUV *= responsiveBoxScale;
  v_responsiveUV += boxOrigin * (responsiveBoxScale - 1.);
  v_responsiveUV += graphicOffset;
  v_responsiveUV /= u_scale;
  v_responsiveUV.x *= responsiveRatio;
  v_responsiveUV = graphicRotation * v_responsiveUV;
  v_responsiveUV.x /= responsiveRatio;

  // ===================================================

  float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
  vec2 patternBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  patternBoxRatio = patternBoxGivenSize.x / patternBoxGivenSize.y;

  vec3 boxSizeData = getBoxSize(patternBoxRatio, patternBoxGivenSize);
  v_patternBoxSize = boxSizeData.xy;
  float patternBoxNoFitBoxWidth = boxSizeData.z;
  vec2 patternBoxScale = u_resolution.xy / v_patternBoxSize;

  v_patternUV = uv;
  v_patternUV += graphicOffset / patternBoxScale;
  v_patternUV += boxOrigin;
  v_patternUV -= boxOrigin / patternBoxScale;
  v_patternUV *= u_resolution.xy;
  v_patternUV /= u_pixelRatio;
  if (u_fit > 0.) {
    v_patternUV *= (patternBoxNoFitBoxWidth / v_patternBoxSize.x);
  }
  v_patternUV /= u_scale;
  v_patternUV = graphicRotation * v_patternUV;
  v_patternUV += boxOrigin / patternBoxScale;
  v_patternUV -= boxOrigin;
  // x100 is a default multiplier between vertex and fragmant shaders
  // we use it to avoid UV presision issues
  v_patternUV *= .01;

  // ===================================================

  vec2 imageBoxSize;
  if (u_fit == 1.) { // contain
    imageBoxSize.x = min(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else if (u_fit == 2.) { // cover
    imageBoxSize.x = max(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else {
    imageBoxSize.x = min(10.0, 10.0 / u_imageAspectRatio * u_imageAspectRatio);
  }
  imageBoxSize.y = imageBoxSize.x / u_imageAspectRatio;
  vec2 imageBoxScale = u_resolution.xy / imageBoxSize;

  v_imageUV = uv;
  v_imageUV *= imageBoxScale;
  v_imageUV += boxOrigin * (imageBoxScale - 1.);
  v_imageUV += graphicOffset;
  v_imageUV /= u_scale;
  v_imageUV.x *= u_imageAspectRatio;
  v_imageUV = graphicRotation * v_imageUV;
  v_imageUV.x /= u_imageAspectRatio;

  v_imageUV += .5;
  v_imageUV.y = 1. - v_imageUV.y;
}`,s=a;function c(e,t,n){let r=e.createShader(t);if(!r)throw Error(`metal-fx: gl.createShader returned null`);if(e.shaderSource(r,n),e.compileShader(r),!e.getShaderParameter(r,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(r);throw e.deleteShader(r),Error(`metal-fx: shader compile failed: ${t??`(no info log)`}`)}return r}function l(e,t,n){let r=e.createProgram();if(!r)throw Error(`metal-fx: gl.createProgram returned null`);if(e.attachShader(r,t),e.attachShader(r,n),e.linkProgram(r),!e.getProgramParameter(r,e.LINK_STATUS)){let t=e.getProgramInfoLog(r);throw e.deleteProgram(r),Error(`metal-fx: program link failed: ${t??`(no info log)`}`)}return r}var u=1.6,d=1.3,f=null,p=null;function m(){if(p!==null)return p;if(typeof document>`u`)return p=!1;try{let e=document.createElement(`canvas`).getContext(`webgl2`);p=!!e,e?.getExtension(`WEBGL_lose_context`)?.loseContext()}catch{p=!1}return p}var h=null;function g(e){h=e}var _=[`u_resolution`,`u_time`,`u_pixelRatio`,`u_colorBack`,`u_colorTint`,`u_repetition`,`u_softness`,`u_shiftRed`,`u_shiftBlue`,`u_distortion`,`u_contour`,`u_angle`,`u_shape`,`u_isImage`,`u_image`,`u_originX`,`u_originY`,`u_worldWidth`,`u_worldHeight`,`u_fit`,`u_scale`,`u_rotation`,`u_offsetX`,`u_offsetY`,`u_imageAspectRatio`];function v(e){e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA);let t=l(e,c(e,e.VERTEX_SHADER,o),c(e,e.FRAGMENT_SHADER,s));e.useProgram(t);let n=e.createBuffer();if(!n)throw Error(`metal-fx: gl.createBuffer returned null`);e.bindBuffer(e.ARRAY_BUFFER,n),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),e.STATIC_DRAW);let r=e.getAttribLocation(t,`a_position`);e.enableVertexAttribArray(r),e.vertexAttribPointer(r,2,e.FLOAT,!1,0,0);let i={};for(let n of _)i[n]=e.getUniformLocation(t,n);let a=e.createTexture();return a&&(e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,a),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([0,0,0,255])),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),i.u_image&&e.uniform1i(i.u_image,0)),{program:t,buffer:n,uniforms:i,dummyTexture:a}}function y(){if(f)return f;let e=Math.min(2,typeof window<`u`&&window.devicePixelRatio||1),t=Math.round(96*e),n=typeof OffscreenCanvas<`u`,r,a;if(n)r=new OffscreenCanvas(t,t),a=r.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1});else{let e=document.createElement(`canvas`);e.width=t,e.height=t,a=e.getContext(`webgl2`,{alpha:!0,premultipliedAlpha:!0,antialias:!1,preserveDrawingBuffer:!0}),r=e}if(!a)throw Error(`metal-fx: WebGL2 not supported`);let{program:o,buffer:s,uniforms:c,dummyTexture:l}=v(a);return r.addEventListener(`webglcontextlost`,e=>{e.preventDefault(),f&&(f.contextLost=!0)},!1),r.addEventListener(`webglcontextrestored`,()=>{if(!f)return;let e=v(f.gl);f.program=e.program,f.buffer=e.buffer,f.uniforms=e.uniforms,f.dummyTexture=e.dummyTexture,f.presetDirty=!0,f.contextLost=!1,h?.()},!1),f={glCanvas:r,gl:a,program:o,buffer:s,uniforms:c,dummyTexture:l,preset:i.chromatic.modes.dark,presetDirty:!0,contextLost:!1,useOffscreen:n,frameBitmap:null,startMs:performance.now(),pausedMs:0,pausedAtMs:null,rafId:0,dpr:e,instances:new Set,frameCount:0,glowQueue:[],glowIdx:0,glowSkip:0,glowPixels:new Uint8Array(t*t*4),glowPixelsW:t,glowPixelsH:t},f}var b=0;function x(){if(!f)return;let e=performance.now();if(e-b<1500)return;b=e;let{gl:t,glCanvas:n}=f,r=n.width,i=n.height;(f.glowPixelsW!==r||f.glowPixelsH!==i)&&(f.glowPixelsW=r,f.glowPixelsH=i,f.glowPixels=new Uint8Array(r*i*4)),t.readPixels(0,0,r,i,t.RGBA,t.UNSIGNED_BYTE,f.glowPixels)}var S={bx:0,by:0};function C(e,t,n){if(!f)return S.bx=0,S.by=0,S;let{glCanvas:r}=f,i=r.width,a=r.height,o=e.dpr,s=e.cssWidth*o,c=e.cssHeight*o,l=140*o,u=40*o,d=i/l*s/e.shaderScale,p=a/u*c/e.shaderScale;d>i&&(d=i),p>a&&(p=a);let m=(i-d)/2,h=(a-p)/2,g=m+t/e.cssWidth*d,_=h+n/e.cssHeight*p;return S.bx=Math.round(g),S.by=Math.round(a-1-_),S}var w={r:0,g:0,b:0,lum:0,count:0};function T(e,t,n,r,i,a){let o=Math.max(1,a|0),s=Math.max(0,r-o),c=Math.min(t,r+o+1),l=Math.max(0,i-o),u=Math.min(n,i+o+1);w.r=0,w.g=0,w.b=0,w.lum=0,w.count=0;for(let n=l;n<u;n++){let r=n*t;for(let t=s;t<c;t++){let n=(r+t)*4;w.r+=e[n],w.g+=e[n+1],w.b+=e[n+2],w.lum+=(.2126*e[n]+.7152*e[n+1]+.0722*e[n+2])/255,w.count++}}return w}var E={r:255,g:255,b:255};function D(e,t,n,r){if(!f)return 0;let i=C(e,t,n),a=T(f.glowPixels,f.glowPixelsW,f.glowPixelsH,i.bx,i.by,r);return a.count>0?a.lum/a.count:0}function ee(e,t,n,r){if(!f)return E.r=255,E.g=255,E.b=255,E;let i=C(e,t,n),a=T(f.glowPixels,f.glowPixelsW,f.glowPixelsH,i.bx,i.by,r);return a.count===0?(E.r=255,E.g=255,E.b=255,E):(E.r=a.r/a.count,E.g=a.g/a.count,E.b=a.b/a.count,E)}function te(e,t,n,r){if(!f)return E.r=255,E.g=255,E.b=255,E;let i=C(e,t,n),{glowPixels:a,glowPixelsW:o,glowPixelsH:s}=f,c=Math.max(1,r|0),l=Math.max(0,i.bx-c),u=Math.min(o,i.bx+c+1),d=Math.max(0,i.by-c),p=Math.min(s,i.by+c+1),m=-1;E.r=255,E.g=255,E.b=255;for(let e=d;e<p;e++){let t=e*o;for(let e=l;e<u;e++){let n=(t+e)*4,r=a[n],i=a[n+1],o=a[n+2],s=Math.max(r,i,o),c=(s>0?(s-Math.min(r,i,o))/s:0)*(.35+s/255*.65);c>m&&(m=c,E.r=r,E.g=i,E.b=o)}}return E}var ne=14,re=1.5,O={x:0,y:0};function k(e=512){return{xy:new Float32Array(e*2),n:0}}function A(e,t,n,r,i,a,o=k()){i=Math.max(0,Math.min(i,Math.min(n,r)/2));let s=60+Math.ceil(2*(n+r)/re)+8;o.xy.length<s*2&&(o.xy=new Float32Array(s*2));let c=o.xy,l=0,u=(e,t)=>{a?(a(e,t,O),c[l*2]=O.x,c[l*2+1]=O.y):(c[l*2]=e,c[l*2+1]=t),l++},d=(e,t,n,r)=>{let i=Math.hypot(n-e,r-t),a=Math.max(1,Math.ceil(i/re));for(let i=0;i<a;i++){let o=i/a;u(e+(n-e)*o,t+(r-t)*o)}},f=(e,t,n,r)=>{for(let a=0;a<=ne;a++){let o=n+(r-n)*(a/ne);u(e+i*Math.cos(o),t+i*Math.sin(o))}};return d(e+i,t,e+n-i,t),f(e+n-i,t+i,-Math.PI/2,0),d(e+n,t+i,e+n,t+r-i),f(e+n-i,t+r-i,0,Math.PI/2),d(e+n-i,t+r,e+i,t+r),f(e+i,t+r-i,Math.PI/2,Math.PI),d(e,t+r-i,e,t+i),f(e+i,t+i,Math.PI,1.5*Math.PI),o.n=l,o}g(()=>{f&&f.instances.size>0&&f.pausedAtMs===null&&me()}),typeof document<`u`&&document.addEventListener(`visibilitychange`,()=>{f&&f.pausedAtMs===null&&!f.contextLost&&(document.hidden?he():f.instances.size>0&&me())});function j(e){let t=y(),n=e.hostCanvas.getContext(`2d`,{alpha:!0});if(!n)throw Error(`metal-fx: canvas 2D context unavailable`);let r=e.scale??1,i={canvas:e.hostCanvas,ctx:n,cssWidth:e.cssWidth,cssHeight:e.cssHeight,cornerRadius:e.cornerRadius,kind:e.kind,ringCssPx:e.ringCssPx??(e.kind===`circle`?2:1)*r,shaderScale:e.shaderScale??(e.kind===`circle`?1.3:1.6)*r,opacityMul:e.opacityMul??1,glowGain:e.glowGain??1,visible:!0,paused:e.paused??!1,everCopied:!1,frozen:null,dpr:typeof window<`u`&&window.devicePixelRatio||1,scale:r,onAfterFrame:e.onAfterFrame,onComposite:e.onComposite,onFirstCopy:e.onFirstCopy,mask:e.mask??null,deform:null,deformLayers:null,overscan:0,cursorLight:null,glowFast:!1,rawCanvas:null,wantRaw:!1,ringCanvas:null,wantRing:!1};return R(i),t.instances.add(i),t.rafId===0&&t.pausedAtMs===null&&me(),i}function M(e){f&&(f.glowQueue.includes(e)||f.glowQueue.push(e))}function N(e,t){let n=!1;t.mask!==void 0&&(e.mask=t.mask),t.cssWidth!==void 0&&t.cssWidth!==e.cssWidth&&(e.cssWidth=t.cssWidth,n=!0),t.cssHeight!==void 0&&t.cssHeight!==e.cssHeight&&(e.cssHeight=t.cssHeight,n=!0),t.cornerRadius!==void 0&&(e.cornerRadius=t.cornerRadius),t.scale!==void 0&&(e.scale=t.scale),t.kind!==void 0&&t.kind!==e.kind&&(e.kind=t.kind,t.shaderScale===void 0&&(e.shaderScale=(t.kind===`circle`?d:u)*e.scale),t.ringCssPx===void 0&&(e.ringCssPx=(t.kind===`circle`?2:1)*e.scale)),t.shaderScale!==void 0&&(e.shaderScale=t.shaderScale),t.ringCssPx!==void 0&&(e.ringCssPx=t.ringCssPx),t.opacityMul!==void 0&&(e.opacityMul=t.opacityMul),t.glowGain!==void 0&&(e.glowGain=t.glowGain),t.paused!==void 0&&t.paused!==e.paused&&(e.paused=t.paused,t.paused?ce(e):e.frozen=null,!t.paused&&f&&f.rafId===0&&f.pausedAtMs===null&&!f.contextLost&&me()),n&&R(e)}function ie(e,t){e.visible=t,t&&f&&f.rafId===0&&f.pausedAtMs===null&&!f.contextLost&&me()}var P=null;function F(e,t){let n=y();n.preset=P??i[e].modes[t],n.presetDirty=!0}var I=null;function ae(e){I=e}function L(e,t){I&&f&&e.visible&&!e.paused&&f.glowQueue.includes(e)&&(e.glowFast=!!I(e,t))}function R(e){e.dpr=typeof window<`u`&&window.devicePixelRatio||1;let t=e.overscan,n=Math.max(1,Math.round((e.cssWidth+2*t)*e.dpr)),r=Math.max(1,Math.round((e.cssHeight+2*t)*e.dpr));e.canvas.width!==n&&(e.canvas.width=n),e.canvas.height!==r&&(e.canvas.height=r);let i=e.canvas.style;t>0?(i.left=`${-t}px`,i.top=`${-t}px`,i.width=`calc(100% + ${2*t}px)`,i.height=`calc(100% + ${2*t}px)`,i.borderRadius=`0`):i.left!==``&&(i.left=``,i.top=``,i.width=`100%`,i.height=`100%`,i.borderRadius=``)}function oe(e){let{ctx:t,dpr:n,canvas:r}=e,i=e.ringCssPx*n,a=r.width,o=r.height,s=Math.max(0,(e.cornerRadius-e.ringCssPx)*n);t.save(),t.globalCompositeOperation=`destination-out`,t.fillStyle=`#000`,t.beginPath(),t.roundRect(i,i,a-2*i,o-2*i,s),t.fill(),t.restore()}var se=k();function z(e,t,n,r,i,a,o,s){let{xy:c,n:l}=A(t,n,r,i,a,o,se);e.beginPath();for(let t=0;t<l;t++)t===0?e.moveTo(c[0]*s,c[1]*s):e.lineTo(c[t*2]*s,c[t*2+1]*s);e.closePath()}function ce(e){if(!f)return null;let t=f.frameBitmap??f.glCanvas,n=f.glCanvas.width,r=f.glCanvas.height;if(n<1||r<1)return null;let i=e.frozen;i||(i=document.createElement(`canvas`),e.frozen=i),(i.width!==n||i.height!==r)&&(i.width=n,i.height=r);let a=i.getContext(`2d`);return a?(a.clearRect(0,0,n,r),a.drawImage(t,0,0),i):(e.frozen=null,null)}function le(e){if(!f)return;let t=(e.paused?e.frozen??ce(e):null)??f.frameBitmap??f.glCanvas,n=e.dpr,r=e.canvas.width,i=e.canvas.height;if(r<1||i<1)return;let a=Math.max(1,Math.round(e.cssWidth*n)),o=Math.max(1,Math.round(e.cssHeight*n)),s=e.overscan*n,c=t.width,l=t.height,u=140*n,d=40*n,p=c/u*a/e.shaderScale,m=l/d*o/e.shaderScale;p>c&&(p=c),m>l&&(m=l);let h=Math.max(0,(c-p)/2),g=Math.max(0,(l-m)/2),_=e.opacityMul*f.preset.shaderOpacity,v=e.ctx;v.clearRect(0,0,r,i);let y=e.deform;if(e.mask){if(_<1&&(v.globalAlpha=_),v.drawImage(t,h,g,p,m,0,0,r,i),_<1&&(v.globalAlpha=1),e.wantRaw){let t=e.rawCanvas;t||(t=document.createElement(`canvas`),e.rawCanvas=t),(t.width!==r||t.height!==i)&&(t.width=r,t.height=i);let n=t.getContext(`2d`);n&&(n.clearRect(0,0,r,i),n.drawImage(e.canvas,0,0))}v.save(),v.globalCompositeOperation=`destination-in`,v.fillStyle=`#000`,e.mask(v,r,i,n),v.restore(),v.globalCompositeOperation=`source-over`}else if(!y)_<1&&(v.globalAlpha=_),v.drawImage(t,h,g,p,m,0,0,r,i),_<1&&(v.globalAlpha=1),oe(e);else{let u=e.cssWidth,d=e.cssHeight,f=e.cornerRadius,h=e.ringCssPx,g=e.deformLayers;v.save(),v.translate(s,s);let b=a/p,x=o/m,S=Math.min(c,p*(a+2*s)/a),C=Math.min(l,m*(o+2*s)/o),w=Math.max(0,(c-S)/2),T=Math.max(0,(l-C)/2),E=S*b,D=C*x;if(_<1&&(v.globalAlpha=_),v.drawImage(t,w,T,S,C,a/2-E/2,o/2-D/2,E,D),_<1&&(v.globalAlpha=1),v.globalCompositeOperation=`destination-in`,z(v,0,0,u,d,f,y,n),v.fillStyle=`#000`,v.fill(),v.globalCompositeOperation=`destination-out`,z(v,h,h,u-2*h,d-2*h,Math.max(0,f-h),y,n),v.fill(),e.wantRing){let c=e.ringCanvas;c||(c=document.createElement(`canvas`),e.ringCanvas=c),(c.width!==r||c.height!==i)&&(c.width=r,c.height=i);let l=c.getContext(`2d`);l&&(l.setTransform(1,0,0,1,0,0),l.globalCompositeOperation=`source-over`,l.clearRect(0,0,r,i),l.translate(s,s),_<1&&(l.globalAlpha=_),l.drawImage(t,w,T,S,C,a/2-E/2,o/2-D/2,E,D),l.globalAlpha=1,l.globalCompositeOperation=`destination-out`,z(l,h,h,u-2*h,d-2*h,Math.max(0,f-h),y,n),l.fillStyle=`#000`,l.fill(),l.globalCompositeOperation=`source-over`,l.setTransform(1,0,0,1,0,0))}if(g?.hairline){let e=g.hairline;v.globalCompositeOperation=`destination-over`,z(v,e.inset,e.inset,u-2*e.inset,d-2*e.inset,Math.max(0,f-e.inset),y,n),v.lineWidth=e.width*n,v.strokeStyle=e.color,v.stroke()}if(g?.fill&&(v.globalCompositeOperation=`destination-over`,z(v,0,0,u,d,f,y,n),v.fillStyle=g.fill,v.fill()),g?.rim){let e=g.rim;v.globalCompositeOperation=`source-over`,v.save(),z(v,0,0,u,d,f,y,n),v.clip();let t=e.inset+e.width/2;z(v,t,t,u-2*t,d-2*t,Math.max(0,f-t),y,n),v.lineWidth=e.width*n,v.strokeStyle=e.color,v.stroke(),v.restore()}v.restore(),v.globalCompositeOperation=`source-over`}if(e.onComposite?.(),e.onFirstCopy){let t=e.onFirstCopy;e.onFirstCopy=void 0,t()}e.onAfterFrame?.()}function ue(){if(!f)return;let{gl:t,uniforms:n,preset:r,glCanvas:i,dpr:a}=f;n.u_resolution&&t.uniform2f(n.u_resolution,i.width,i.height),n.u_pixelRatio&&t.uniform1f(n.u_pixelRatio,a),n.u_colorBack&&t.uniform4fv(n.u_colorBack,e(r.colorBack)),n.u_colorTint&&t.uniform4fv(n.u_colorTint,e(r.colorTint)),n.u_repetition&&t.uniform1f(n.u_repetition,r.repetition),n.u_softness&&t.uniform1f(n.u_softness,r.softness),n.u_shiftRed&&t.uniform1f(n.u_shiftRed,r.shiftRed),n.u_shiftBlue&&t.uniform1f(n.u_shiftBlue,r.shiftBlue),n.u_distortion&&t.uniform1f(n.u_distortion,r.distortion),n.u_contour&&t.uniform1f(n.u_contour,r.contour),n.u_angle&&t.uniform1f(n.u_angle,r.angle),n.u_shape&&t.uniform1f(n.u_shape,r.shape),n.u_isImage&&t.uniform1i(n.u_isImage,0),n.u_imageAspectRatio&&t.uniform1f(n.u_imageAspectRatio,1),n.u_originX&&t.uniform1f(n.u_originX,r.originX),n.u_originY&&t.uniform1f(n.u_originY,r.originY),n.u_worldWidth&&t.uniform1f(n.u_worldWidth,r.worldWidth),n.u_worldHeight&&t.uniform1f(n.u_worldHeight,r.worldHeight),n.u_fit&&t.uniform1f(n.u_fit,r.fit),n.u_scale&&t.uniform1f(n.u_scale,r.scale),n.u_rotation&&t.uniform1f(n.u_rotation,r.rotation),n.u_offsetX&&t.uniform1f(n.u_offsetX,r.offsetX),n.u_offsetY&&t.uniform1f(n.u_offsetY,r.offsetY),f.presetDirty=!1}function de(e){if(!f)return;let{gl:t,uniforms:n,preset:r,glCanvas:i}=f,a=(e-f.startMs-f.pausedMs)/1e3*r.speed;t.viewport(0,0,i.width,i.height),t.clearColor(0,0,0,0),t.clear(t.COLOR_BUFFER_BIT),f.presetDirty&&ue(),n.u_time&&t.uniform1f(n.u_time,a),t.drawArrays(t.TRIANGLES,0,6),f.frameCount++}var fe=0;function pe(e){if(!f)return;if(f.contextLost){f.rafId=0;return}let t=!1;for(let e of f.instances)if(e.visible&&(!e.paused||!e.everCopied)){t=!0;break}if(!t){f.rafId=0;return}if(f.rafId=requestAnimationFrame(pe),e-fe<66){if(I)for(let t of f.glowQueue)t.glowFast&&t.visible&&!t.paused&&(t.glowFast=!!I(t,e));return}fe=e,de(e),x(),f.useOffscreen&&(f.frameBitmap?.close(),f.frameBitmap=f.glCanvas.transferToImageBitmap());for(let e of f.instances)e.visible&&(e.paused&&e.everCopied||(le(e),e.everCopied=!0));if(I&&f.glowQueue.length>0&&++f.glowSkip%1==0)for(let t of f.glowQueue)t.visible&&!t.paused&&(t.glowFast=!!I(t,e))}function me(){f&&f.rafId===0&&(f.rafId=requestAnimationFrame(pe))}function he(){f&&(f.rafId!==0&&cancelAnimationFrame(f.rafId),f.rafId=0)}var ge={linear:e=>e,smoothstep:e=>e*e*(3-2*e)};function _e(e,t,n,r=ge.linear){return{from:e,to:t,dur:n,ease:r,startMs:-1,val:e,done:!1}}function ve(e,t){e.startMs=t,e.val=e.from,e.done=!1}function ye(e,t){if(e.done||e.startMs<0)return e.val;let n=Math.min(1,(t-e.startMs)/e.dur);return e.val=e.from+(e.to-e.from)*e.ease(n),n>=1&&(e.done=!0),e.val}var B={...Object.freeze({haloOpMul:2,extraIntensity:3.51,peakOp:.85,baseOp:.34,inset:1.5,extraOutward:1,wanderRange:15,wanderLerp:.0075,fadeRate:.00875,lumLo:.08,lumHi:.32,minDwellMs:1500,relocFadeMs:300,relocFadeOutMs:450,pointGain:2.5,haloHalfLen:7.8,extraHalfLen:9.13952/3,haloStrokeXl:26.4,haloStrokeLg:15.6,haloStrokeMd:7.2,haloStrokeSm:3,haloBlurXl:8.4,haloBlurLg:4.8,haloBlurMd:2.1,haloBlurSm:.9,haloOpXl:.385,haloOpLg:.595,haloOpMd:.7,haloOpSm:.7,extraStrokeOuter:4/3,extraStrokeCore:2/3,extraBlurOuter:2/3,extraBlurCore:1.35/3,extraFadeR:13/3,extraOpOuter:.85})},be={...Object.freeze({enabled:!0,reach:56,fadeMs:200,cursor:!0,cursorDistance:186,cursorStrength:3.35,cursorDiffuse:1.4,cursorFalloff:37,cursorDepth:.4,cursorEdge:0,cursorReach:11.5,cursorBlur:.5,cursorZoom:3,spill:!1,spillRadius:48,spillStrength:.55,spillOffset:.35,spillLumGain:.7,spillSaturation:1.3,spillInside:.5,spillBlur:0,catchLight:!1,catchFollow:.25,catchGain:1})},xe=!1,Se=0,Ce=0,we=0,Te=!1,Ee=0,De=0,V=NaN,H=NaN,Oe=0,ke=0,U=0,W=0,G=null,K={d:0,nx:0,ny:0,k:1,left:0,top:0},Ae={x:0,y:0},q={r:255,g:255,b:255},J=null,je=``,Me=-1,Ne=-1,Pe=!1;function Fe(){we++,Re()}var Ie=e=>typeof window.matchMedia==`function`&&window.matchMedia(e).matches;function Le(){if(xe||performance.now()<Se||1)return!1;let e=window.visualViewport;return!(e&&Math.abs(e.scale-1)>.001)}function Re(){Te||we===0||typeof document>`u`||Ie(`(pointer: fine)`)&&(Te=!0,document.addEventListener(`pointermove`,Ve,{passive:!0}),document.addEventListener(`pointerleave`,Ue),document.addEventListener(`pointercancel`,Ue),document.addEventListener(`keydown`,He,{passive:!0}),document.addEventListener(`visibilitychange`,Ue),window.addEventListener(`blur`,Ue))}var ze=!0,Be=!1;function Ve(e){ze=e.pointerType===`mouse`||e.pointerType===``,Be=!1,V=Oe=e.clientX,H=ke=e.clientY,qe&&Ke&&(ze&&nt(V,H)||Z()),We()}function He(){Be=!0,Z()}function Ue(){V=H=NaN,We()}function We(){Te&&Ee===0&&(De=performance.now(),Ee=requestAnimationFrame(ot))}function Ge(e,t,n,r,i,a,o){let s=a===`circle`?Math.min(n,r)/2:Math.max(0,Math.min(i,Math.min(n,r)/2)),c=n/2,l=r/2,u=Math.max(0,n/2-s),d=Math.max(0,r/2-s),f=Math.max(-u,Math.min(u,e-c)),p=Math.max(-d,Math.min(d,t-l)),m=e-c-f,h=t-l-p,g=Math.hypot(m,h);if(g>1e-6)return o.x=c+f+m/g*s,o.y=l+p+h/g*s,g-s;let _=e,v=n-e,y=t,b=r-t,x=Math.min(_,v,y,b);return x===_?(o.x=0,o.y=t):x===v?(o.x=n,o.y=t):x===y?(o.x=e,o.y=0):(o.x=e,o.y=r),-x}var Ke=null,qe=!1,Y=!1,Je=``,X=null,Ye=``,Xe=/^(INPUT|TEXTAREA|SELECT)$/,Ze=new WeakMap,Qe=0,$e=null;function et(e){let t=e;for(;t&&t!==document.body;){if(Xe.test(t.tagName)||t.isContentEditable)return!0;t=t.parentElement}return!1}function tt(){if(Ke)return!0;let e=document.createElement(`div`);e.className=`metal-fx-cursor`,e.setAttribute(`aria-hidden`,`true`),e.style.cssText=`position:fixed;left:0;top:0;pointer-events:none;z-index:2147483001;will-change:transform;transform-origin:0 0;display:none`;let t=document.createElement(`canvas`);t.style.display=`block`,e.appendChild(t),document.body.appendChild(e);let n=t.getContext(`2d`),r=document.createElement(`canvas`).getContext(`2d`);return!n||!r?(e.remove(),!1):(Ke=e,!0)}function nt(e,t,n=!1){let r=performance.now();if(!n&&Y&&r-Qe<12)return!0;Qe=r;let i=document.elementFromPoint(e,t);if(!i)return rt(),!1;if(i===$e&&Y)return!0;$e=i;let a=Ze.get(i);if(a===void 0){if(a=!et(i),a){let e=getComputedStyle(i).cursor;a=e===`auto`||e==="default"||e===`none`}Ze.set(i,a)}if(!a)return rt(),!1;if(!Y){let e=document.documentElement;Je=e.style.cursor,e.style.cursor=`none`,Y=!0}return i!==X&&(X&&(X.style.cursor=Ye,X=null,Ye=``),getComputedStyle(i).cursor!==`none`&&(X=i,Ye=i.style.cursor,i.style.cursor=`none`)),!0}function rt(){X&&(X.isConnected&&(X.style.cursor=Ye),X=null,Ye=``),Y&&(document.documentElement.style.cursor=Je,Y=!1,Je=``),$e=null,Ze=new WeakMap}function Z(){rt(),Ke&&qe&&(Ke.style.display=`none`,qe=!1)}function it(){if(J)return J;let e=document.createElement(`div`);return e.className=`metal-fx-cursor-spill`,e.setAttribute(`aria-hidden`,`true`),e.style.cssText=`position:fixed;left:0;top:0;pointer-events:none;z-index:2147483000;border-radius:50%;mix-blend-mode:plus-lighter;will-change:transform,opacity;opacity:0;display:none`,document.body.appendChild(e),J=e,e}function at(){J&&Pe&&(J.style.display=`none`,J.style.opacity=`0`,Pe=!1)}function ot(e){if(Ee=0,!Te)return;let t=performance.now();try{st(e)}catch(e){xe=!0,Z(),at(),G&&=(G.cursorLight=null,null),typeof console<`u`&&console.warn(`metal-fx: cursor light disabled after error`,e);return}performance.now()-t>6?++Ce>=20&&(Ce=0,Se=performance.now()+5e3,Z()):Ce>0&&Ce--}function st(e){let r=be,i=Math.min(.05,Math.max(.001,(e-De)/1e3));De=e;let a=null,o=0,s=0;if(r.enabled&&f&&!Number.isNaN(V)){let e=1/0,t=Math.max(1,r.reach),n=r.cursor&&Le()?Math.max(1,r.cursorDistance):0,i=Math.max(t,n);for(let t of f.instances){if(!t.visible||!t.canvas.isConnected)continue;let n=t.canvas.getBoundingClientRect();if(n.width<=0)continue;let r=t.overscan,o=n.width/(t.cssWidth+2*r),s=n.left+r*o,c=n.top+r*o,l=i*o;if(V<s-l||V>s+t.cssWidth*o+l||H<c-l||H>c+t.cssHeight*o+l)continue;let u=Ge((V-s)/o,(H-c)/o,t.cssWidth,t.cssHeight,t.cornerRadius,t.kind,Ae),d=Math.abs(u);d<=i&&d<e&&(e=d,a=t,K.d=u,K.nx=Ae.x,K.ny=Ae.y,K.k=o,K.left=s,K.top=c)}if(a){if(e<=t){let n=1-e/t;o=n*n*(3-2*n)}e<=n&&(s=Math.min(1,(1-e/n)*3)),a.mask&&(K.nx=a.cssWidth/2,K.ny=a.cssHeight/2,a.wantRaw=!0)}}let c=1-Math.exp(-(i*1e3)/(Math.max(1,r.fadeMs)/3));if(U+=(o-U)*c,W+=(s-W)*c,a&&a!==G&&(G&&(G.cursorLight=null,L(G,e)),G=a),!a&&U<.002&&W<.002){U=0,W=0,G&&=(G.cursorLight=null,L(G,e),null),at(),Z();return}if(G){if(r.catchLight){let e=G.cursorLight??(G.cursorLight={x:0,y:0,w:0});e.x=K.nx,e.y=K.ny,e.w=U}else G.cursorLight&&(G.cursorLight=null);if(L(G,e),r.cursor&&W>.002&&ze&&!Be&&!Number.isNaN(V)&&Le()&&tt()&&nt(V,H)||Z(),r.spill){let e=it(),i=ee(G,K.nx,K.ny,2),a=D(G,K.nx,K.ny,3),o=Math.max(i.r,i.g,i.b)||1,s=t(i.r*255/o,i.g*255/o,i.b*255/o),[c,l,u]=n(s[0],Math.min(1,s[1]*r.spillSaturation),1);q.r+=(c-q.r)*.15,q.g+=(l-q.g)*.15,q.b+=(u-q.b)*.15;let d=Math.round(q.r/6)*6,f=Math.round(q.g/6)*6,p=Math.round(q.b/6)*6,m=`radial-gradient(closest-side, rgba(${d},${f},${p},1) 0%, rgba(${d},${f},${p},0.35) 45%, rgba(${d},${f},${p},0) 100%)`;m!==je&&(je=m,e.style.background=m);let h=Math.max(1,r.spillRadius*K.k);h!==Me&&(Me=h,e.style.width=`${(2*h).toFixed(1)}px`,e.style.height=`${(2*h).toFixed(1)}px`),r.spillBlur!==Ne&&(Ne=r.spillBlur,e.style.filter=r.spillBlur>0?`blur(${r.spillBlur}px)`:``);let g=K.left+K.nx*K.k,_=K.top+K.ny*K.k,v=Oe+(g-Oe)*r.spillOffset,y=ke+(_-ke)*r.spillOffset;e.style.transform=`translate3d(${(v-h).toFixed(2)}px,${(y-h).toFixed(2)}px,0)`;let b=Math.min(1,Math.max(0,a/.3)),x=1-r.spillLumGain+r.spillLumGain*b,S=K.d<0?r.spillInside:1,C=Math.max(0,Math.min(1,r.spillStrength*U*x*S));Pe||=(e.style.display=``,!0),e.style.opacity=C.toFixed(3)}else at();Ee=requestAnimationFrame(ot)}}var ct=new Map;function lt(e,t){let n=Math.sqrt(12*e*e/t+1),r=Math.floor(n);r%2==0&&r--;let i=r+2,a=(12*e*e-t*r*r-4*t*r-3*t)/(-4*r-4),o=Math.round(a),s=[];for(let e=0;e<t;e++)s.push(e<o?r:i);return s}function ut(e,t,n,r,i){let a=1/(i+i+1);for(let o=0;o<r;o++){let r=o*n,s=0;for(let t=-i;t<=i;t++)s+=e[r+Math.min(n-1,Math.max(0,t))];for(let o=0;o<n;o++){t[r+o]=s*a;let c=r+Math.max(0,o-i),l=r+Math.min(n-1,o+i+1);s+=e[l]-e[c]}}}function dt(e,t,n,r,i){let a=1/(i+i+1);for(let o=0;o<n;o++){let s=0;for(let t=-i;t<=i;t++)s+=e[Math.min(r-1,Math.max(0,t))*n+o];for(let c=0;c<r;c++){t[c*n+o]=s*a;let l=Math.max(0,c-i)*n+o,u=Math.min(r-1,c+i+1)*n+o;s+=e[u]-e[l]}}}function ft(e,t,n,r){if(r<=.05)return e;let i=new Float32Array(e.length),a=e;for(let e of lt(r,3)){let r=(e-1)/2;ut(a,i,t,n,r),dt(i,a,t,n,r)}return a}function pt(e,t,n,r,i,a,o){let s=document.createElement(`canvas`);s.width=n,s.height=r;let c=s.getContext(`2d`,{willReadFrequently:!0}),l=new Float32Array(n*r);if(!c)return l;c.scale(i,i),c.strokeStyle=`#fff`,c.lineCap=`round`,c.lineJoin=`round`,c.lineWidth=t,c.beginPath(),c.moveTo(a-e,o),c.lineTo(a+e,o),c.stroke();let u=c.getImageData(0,0,n,r).data;for(let e=0,t=3;e<l.length;e++,t+=4)l[e]=u[t]/255;return l}function mt(e,t,n,r,i){let a=0;for(let t of e)a=Math.max(a,(t.stroke/2+3*t.blur)*n);let o=Math.ceil(a)+1,s=2*t+2*o,c=2*o,l=Math.ceil(s*r),u=Math.ceil(c*r),d=new Float32Array(l*u);for(let i of e){let e=pt(t,i.stroke*n,l,u,r,o,o);e=ft(e,l,u,i.blur*n*r);let a=i.opacity;for(let t=0;t<d.length;t++){let n=e[t]*a;d[t]=d[t]+n*(1-d[t])}}if(i>0){let e=o*r,t=o*r,a=i*n*r;for(let n=0;n<u;n++)for(let r=0;r<l;r++){let i=Math.hypot(r+.5-e,n+.5-t)/a,o;o=i<=.3?1:i<=.65?1-(i-.3)/.35*.75:i<1?.25*(1-(i-.65)/.35):0,d[n*l+r]*=o}}let f=document.createElement(`canvas`);f.width=l,f.height=u;let p=f.getContext(`2d`),m=new Uint8ClampedArray(l*u);for(let e=0;e<d.length;e++)m[e]=Math.round(Math.min(1,d[e])*255);if(p){let e=p.createImageData(l,u),t=e.data;for(let e=0,n=0;e<d.length;e++,n+=4)t[n]=255,t[n+1]=255,t[n+2]=255,t[n+3]=m[e];p.putImageData(e,0,0)}return{canvas:f,alpha:m,w:s,h:c,ax:o,ay:o}}function ht(){return[B.haloStrokeXl,B.haloStrokeLg,B.haloStrokeMd,B.haloStrokeSm,B.haloBlurXl,B.haloBlurLg,B.haloBlurMd,B.haloBlurSm,B.haloOpXl,B.haloOpLg,B.haloOpMd,B.haloOpSm,B.extraStrokeOuter,B.extraStrokeCore,B.extraBlurOuter,B.extraBlurCore,B.extraFadeR,B.extraOpOuter].join(`,`)}function gt(e,t,n){let r=`h|${e.toFixed(2)}|${t}|${n}|${ht()}`,i=ct.get(r);return i||(i=mt([{stroke:B.haloStrokeXl,blur:B.haloBlurXl,opacity:B.haloOpXl},{stroke:B.haloStrokeLg,blur:B.haloBlurLg,opacity:B.haloOpLg},{stroke:B.haloStrokeMd,blur:B.haloBlurMd,opacity:B.haloOpMd},{stroke:B.haloStrokeSm,blur:B.haloBlurSm,opacity:B.haloOpSm}],e,t,n,0),ct.set(r,i)),i}function _t(e,t,n){let r=`e|${e.toFixed(2)}|${t}|${n}|${ht()}`,i=ct.get(r);return i||(i=mt([{stroke:B.extraStrokeOuter,blur:B.extraBlurOuter,opacity:B.extraOpOuter},{stroke:B.extraStrokeCore,blur:B.extraBlurCore,opacity:1}],e,t,n,B.extraFadeR),ct.set(r,i)),i}function vt(e,t,n,r,i){let a=t<<16|n<<8|r;if(i.canvas&&i.tint===a&&i.src===e)return i.canvas;let o=i.canvas,s=i.img;(!o||!s||i.src!==e)&&(o=document.createElement(`canvas`),o.width=e.canvas.width,o.height=e.canvas.height,s=o.getContext(`2d`)?.createImageData(o.width,o.height)??null);let c=o.getContext(`2d`);if(c&&s){let i=s.data,a=e.alpha;for(let e=0,o=0;e<a.length;e++,o+=4)i[o]=t,i[o+1]=n,i[o+2]=r,i[o+3]=a[e];c.putImageData(s,0,0)}return i.canvas=o,i.img=s,i.tint=a,i.src=e,o}function yt(e,t,n){let r=Math.max(0,Math.min(n,Math.min(e,t)/2));return 2*Math.max(0,e-2*r)+2*Math.max(0,t-2*r)+2*Math.PI*r}function bt(e,t,n,r){return r===`circle`?2*Math.PI*Math.max(0,Math.min(n,Math.min(e,t)/2)):yt(e,t,n)}function xt(e,t,n,r,i,a,o,s){let c=s||{x:0,y:0},l=Math.max(0,Math.min(r,Math.min(t,n)/2));if(o===`circle`){let r=2*Math.PI*l;if(r<=1e-4)return c.x=t*.5,c.y=n*.5,c;e=(e%r+r)%r;let o=-Math.PI/2+e/r*Math.PI*2,s=Math.max(0,l-i+a);return c.x=t*.5+s*Math.cos(o),c.y=n*.5+s*Math.sin(o),c}let u=Math.max(0,t-2*l),d=Math.max(0,n-2*l),f=Math.PI*l/2,p=2*(u+d)+4*f;e=(e%p+p)%p;let m=Math.max(0,l-i+a),h=e;if(h<u)return c.x=l+h,c.y=i-a,c;if(h-=u,h<f){let e=-Math.PI/2+(f>0?h/f:0)*(Math.PI/2);return c.x=t-l+m*Math.cos(e),c.y=l+m*Math.sin(e),c}if(h-=f,h<d)return c.x=t-i+a,c.y=l+h,c;if(h-=d,h<f){let e=(f>0?h/f:0)*(Math.PI/2);return c.x=t-l+m*Math.cos(e),c.y=n-l+m*Math.sin(e),c}if(h-=f,h<u)return c.x=t-l-h,c.y=n-i+a,c;if(h-=u,h<f){let e=Math.PI/2+(f>0?h/f:0)*(Math.PI/2);return c.x=l+m*Math.cos(e),c.y=n-l+m*Math.sin(e),c}if(h-=f,h<d)return c.x=i-a,c.y=n-l-h,c;h-=d;let g=Math.PI+(f>0?h/f:0)*(Math.PI/2);return c.x=l+m*Math.cos(g),c.y=l+m*Math.sin(g),c}function St(e,t,n,r,i,a){let o=Math.max(0,Math.min(i,Math.min(n,r)/2));if(a===`circle`){let i=2*Math.PI*o;return i<=1e-4?0:((Math.atan2(t-r/2,e-n/2)+Math.PI/2)/(2*Math.PI)*i%i+i)%i}let s=Math.max(0,n-2*o),c=Math.max(0,r-2*o),l=Math.PI*o/2,u=Math.PI/2,d=s,f=d+l,p=f+c,m=p+l,h=m+s,g=h+l,_=g+c,v=e>=o&&e<=n-o,y=t>=o&&t<=r-o;if(v&&y){let i=e,a=n-e,s=t,c=r-t,l=Math.min(i,a,s,c);return l===s?e-o:l===a?f+(t-o):l===c?m+(n-o-e):g+(r-o-t)}return v?t<r/2?e-o:m+(n-o-e):y?e>n/2?f+(t-o):g+(r-o-t):e>n/2&&t<r/2?d+(Math.atan2(t-o,e-(n-o))+u)/u*l:e>n/2?p+Math.atan2(t-(r-o),e-(n-o))/u*l:t>r/2?h+(Math.atan2(t-(r-o),e-o)-u)/u*l:_+(Math.atan2(t-o,e-o)+Math.PI)/u*l}var Ct={x:0,y:0},wt={x:0,y:0};function Tt(e,t,n,r,i,a){let o=.1;return xt(e-o,t,n,r,i,0,a,Ct),xt(e+o,t,n,r,i,0,a,wt),Math.atan2(wt.y-Ct.y,wt.x-Ct.x)}function Et(e,t,n){if(e===t)return n<e?0:1;let r=Math.max(0,Math.min(1,(n-e)/(t-e)));return r*r*(3-2*r)}function Dt(e){if(e.samplePoints&&e.samplePoints.length>0)return e.samplePoints.map((e,t)=>({x:e.x,y:e.y,arc:t}));let t=bt(e.width,e.height,e.cornerRadius,e.kind),n=B.inset*(e.scale??1),r=[];for(let i=0;i<16;i++){let a=i/16*t,o=xt(a,e.width,e.height,e.cornerRadius,n,0,e.kind);r.push({x:o.x,y:o.y,arc:a})}return r}var Ot=.05,kt=1e3/15*120,At=1e3/15,jt=2e3,Mt=400,Nt=2.625,Pt=1.008,Ft=.31,It=140,Lt=40,Rt=20,zt=34,Bt=.25,Vt=.01,Ht=.004,Ut=.5,Wt=3.5,Q={x:0,y:0};function Gt(e,t){let{width:n,height:r}=t,i=t.scale??1,a=Math.min(3,typeof window<`u`&&window.devicePixelRatio||1),o=bt(n,r,t.cornerRadius,t.kind)/yt(It,Lt,Rt),s=Math.max(1,B.haloHalfLen*o),c=Math.max(.6,B.extraHalfLen*o),l=gt(s,i,a),u=_t(c,i,a),d=Math.ceil(Math.max(l.ay,u.ay)+B.extraOutward*o*i+2),f=document.createElement(`div`);f.className=`metal-fx-glow-svg`,f.setAttribute(`aria-hidden`,`true`);let p=document.createElement(`div`);p.className=`metal-fx-glow-env`,p.style.cssText=`position:absolute;inset:0;pointer-events:none;opacity:0`;let m=document.createElement(`canvas`);m.className=`metal-fx-glow-canvas`;let h=n+2*d,g=r+2*d;m.width=Math.ceil(h*a),m.height=Math.ceil(g*a),m.style.cssText=`position:absolute;left:${-d}px;top:${-d}px;width:${h}px;height:${g}px;pointer-events:none`,p.appendChild(m),f.appendChild(p),e.appendChild(f);let _=m.getContext(`2d`,{willReadFrequently:!!t.maskDataUrl});if(!_)throw Error(`metal-fx: glow canvas 2D context unavailable`);let v={wrap:f,env:p,canvas:m,ctx:_,surroundPath:null,bandPath:null,maskAlpha:null,maskReady:!1,margin:d,dpr:a,halo:l,extra:u,haloTint:{canvas:null,img:null,tint:-1,src:null},extraTint:{canvas:null,img:null,tint:-1,src:null},mO:k(),mI:k(),maskSum:NaN,maskDeformed:!1,deform:null,width:n,height:r,cornerRadius:t.cornerRadius,kind:t.kind,scale:i,perim:Dt(t),pointMode:!!(t.samplePoints&&t.samplePoints.length>0),currentIdx:0,appearedAt:0,glowOpacity:0,relocTween:null,relocNextIdx:-1,relocMul:0,envClock:0,cursorMode:!1,cursorArc:0,cursorTargetArc:0,lastTickMs:0,wanderS:0,wanderTargetS:0,wanderFrames:0,tintFrom:{r:255,g:255,b:255},tintTarget:{r:255,g:255,b:255},tintTween:null,tintHoldUntil:0,dX:NaN,dY:NaN,dAng:NaN,dEX:NaN,dEY:NaN,dHOp:NaN,dEOp:NaN,dHaloTint:``,dExtraTint:``,dirty:!0,dEnv:-1};if(t.maskDataUrl){let e=new Image;e.onload=()=>{let t=document.createElement(`canvas`);t.width=m.width,t.height=m.height;let i=t.getContext(`2d`,{willReadFrequently:!0});if(!i)return;i.scale(a,a),i.drawImage(e,d,d,n,r);let o=i.getImageData(0,0,t.width,t.height).data,s=t.width*t.height,c=new Float32Array(s);for(let e=0,t=3;e<s;e++,t+=4)c[e]=o[t]/255;let l=ft(Float32Array.from(c),t.width,t.height,Wt*a),u=0;for(let e=0;e<s;e++)l[e]>u&&(u=l[e]);let f=u>0?Ut/u:0,p=new Uint8ClampedArray(s);for(let e=0;e<s;e++)p[e]=Math.round(Math.max(c[e],l[e]*f)*255);v.maskAlpha=p,v.maskReady=!0,v.dirty=!0},e.src=t.maskDataUrl}else Kt(v,null);return v}function Kt(e,t){if(e.pointMode)return;let{margin:n,width:r,height:i,cornerRadius:a}=e,o=e.kind===`circle`?2:1;A(0,0,r,i,a,t,e.mO),A(o,o,r-2*o,i-2*o,Math.max(0,a-o),t,e.mI);let s=new Path2D;qt(s,e.mO,n);let c=new Path2D;qt(c,e.mO,n),qt(c,e.mI,n);let l=new Path2D;l.rect(0,0,r+2*n,i+2*n),l.addPath(s),e.surroundPath=l,e.bandPath=c,e.maskReady=!0}function qt(e,t,n){let r=t.xy;for(let i=0;i<t.n;i++){let t=r[i*2]+n,a=r[i*2+1]+n;i===0?e.moveTo(t,a):e.lineTo(t,a)}e.closePath()}function Jt(e,t){if(!e)return 0;A(0,0,t.width,t.height,t.cornerRadius,e,t.mO);let n=0,r=t.mO.xy;for(let e=0;e<t.mO.n;e+=4)n+=r[e*2]*1.37+r[e*2+1];return n}function Yt(e,t){if(e.deform=t,!e.pointMode){if(t){let n=Jt(t,e);n!==e.maskSum&&(e.maskSum=n,Kt(e,t),e.maskDeformed=!0,e.dirty=!0)}else e.maskDeformed&&(e.maskSum=NaN,Kt(e,null),e.maskDeformed=!1,e.dirty=!0)}}function Xt(e,r,i,a,o=`dark`){let{width:s,height:c,cornerRadius:l,perim:u}=e;if(u.length===0)return!1;let d=-1,f=e.currentIdx,p=0;for(let t=0;t<u.length;t++){let n=u[t],i=D(r,n.x,n.y,2);i>d&&(d=i,f=t),t===e.currentIdx&&(p=i)}let m=e.appearedAt>0&&i-e.appearedAt<B.minDwellMs,h=B.baseOp+(B.peakOp-B.baseOp)*Et(B.lumLo,B.lumHi,p),g=!m&&d-p>Ot,_=r.cursorLight,v=be.enabled&&be.catchLight&&!e.pointMode&&!!_&&_.w>.02,y=bt(s,c,l,e.kind);v&&(e.cursorTargetArc=St(_.x,_.y,s,c,l,e.kind));let b=v?Math.min(1,B.peakOp*be.catchGain*_.w):0,x=e.lastTickMs>0?Math.min(200,Math.max(.5,i-e.lastTickMs)):At;e.lastTickMs=i,e.envClock+=Math.min(x,zt);let S=e=>1-(1-e)**(x/At),C=Math.max(1,B.relocFadeMs),w=Math.max(1,B.relocFadeOutMs),T=()=>{e.appearedAt=i,e.wanderS=0,e.wanderTargetS=0,e.wanderFrames=0,e.relocTween=_e(0,1,C,ge.smoothstep),ve(e.relocTween,e.envClock)},E=t=>{e.relocNextIdx=t,e.relocTween=_e(1,0,w,ge.smoothstep),ve(e.relocTween,e.envClock)};if(e.relocTween?.done&&e.relocTween.to===0){let t=e.relocNextIdx;if(t===-2&&!v&&(t=-3),t===-3)e.cursorMode=!1,e.appearedAt=0,e.relocTween=null;else if(t===-2)e.cursorMode=!0,e.cursorArc=e.cursorTargetArc,e.glowOpacity=b,T();else{e.currentIdx=t;let n=u[e.currentIdx],i=D(r,n.x,n.y,2);e.glowOpacity=B.baseOp+(B.peakOp-B.baseOp)*Et(B.lumLo,B.lumHi,i),T()}}if((!e.relocTween||e.relocTween.done)&&(e.appearedAt===0?(v?(e.cursorMode=!0,e.cursorArc=e.cursorTargetArc,e.glowOpacity=b):(e.cursorMode=!1,e.currentIdx=f,e.glowOpacity=h),T()):v===e.cursorMode?!e.cursorMode&&g&&E(f):E(v?-2:-3)),e.cursorMode){v&&(e.glowOpacity=b);let t=1-(1-Math.max(.01,Math.min(1,be.catchFollow)))**(x/(1e3/60)),n=e.cursorTargetArc-e.cursorArc;n=(n%y+y*1.5)%y-y/2,e.cursorArc+=n*t}else e.glowOpacity+=(h-e.glowOpacity)*S(B.fadeRate);e.glowOpacity=Math.max(0,Math.min(1,e.glowOpacity)),e.relocMul=e.relocTween?ye(e.relocTween,e.envClock):1;let ne=bt(s,c,l,e.kind)/yt(It,Lt,Rt),re=B.wanderRange*ne;e.wanderFrames+=x,e.wanderFrames>=kt&&(e.wanderTargetS=(Math.random()*2-1)*re,e.wanderFrames=0),e.wanderS+=(e.wanderTargetS-e.wanderS)*S(B.wanderLerp);let O,k,A,j,M;if(e.pointMode){let t=u[e.currentIdx];O=t.x+e.wanderS,k=t.y,A=0,j=O,M=k}else{let t=e.cursorMode?e.cursorArc:u[e.currentIdx].arc+e.wanderS,n=B.inset*e.scale;xt(t,s,c,l,n,0,e.kind,Q),O=Q.x,k=Q.y,A=Tt(t,s,c,l,n,e.kind),xt(t,s,c,l,n,B.extraOutward*ne*e.scale,e.kind,Q),j=Q.x,M=Q.y}e.deform&&(e.deform(O,k,Q),O=Q.x,k=Q.y,e.deform(j,M,Q),j=Q.x,M=Q.y);let N=o===`light`,ie=N?te(r,O,k,2):ee(r,O,k,2);e.tintTween?e.tintTween.done&&(N?(e.tintFrom={r:e.tintFrom.r+(e.tintTarget.r-e.tintFrom.r)*e.tintTween.val,g:e.tintFrom.g+(e.tintTarget.g-e.tintFrom.g)*e.tintTween.val,b:e.tintFrom.b+(e.tintTarget.b-e.tintFrom.b)*e.tintTween.val},e.tintTarget={...ie},e.tintTween=_e(0,1,Mt),ve(e.tintTween,i)):i>=e.tintHoldUntil&&(e.tintFrom={...e.tintTarget},e.tintTarget={...ie},e.tintTween=_e(0,1,Mt),ve(e.tintTween,i),e.tintHoldUntil=i+jt)):(e.tintFrom={...ie},e.tintTarget={...ie},e.tintTween=_e(0,1,Mt),ve(e.tintTween,i),e.tintHoldUntil=N?0:i+jt),ye(e.tintTween,i);let P=e.tintTween.val,F,I,ae;if(N)F=Math.round(e.tintFrom.r+(e.tintTarget.r-e.tintFrom.r)*P),I=Math.round(e.tintFrom.g+(e.tintTarget.g-e.tintFrom.g)*P),ae=Math.round(e.tintFrom.b+(e.tintTarget.b-e.tintFrom.b)*P);else{let t=e.tintFrom.r+(e.tintTarget.r-e.tintFrom.r)*P,n=e.tintFrom.g+(e.tintTarget.g-e.tintFrom.g)*P,r=e.tintFrom.b+(e.tintTarget.b-e.tintFrom.b)*P,i=Math.max(t,n,r)||1;F=Math.round(t/i*255),I=Math.round(n/i*255),ae=Math.round(r/i*255)}let L=`rgb(${F},${I},${ae})`,R=`#ffffff`;if(N){let e=t(F,I,ae),[r,i,a]=n(e[0],Math.min(1,e[1]*Nt),Math.max(Ft,e[2]*Pt));R=`rgb(${r},${i},${a})`}let oe=Math.max(0,Math.min(1,a))*(e.pointMode?B.pointGain:1),se=Math.min(1,e.glowOpacity*B.haloOpMul*oe),z=Math.min(1,e.glowOpacity*B.extraIntensity*oe);if(Math.abs(e.relocMul-e.dEnv)>.002){let t=e.relocMul>=.998&&e.dEnv<.998;e.dEnv=e.relocMul,e.env.style.opacity=e.relocMul.toFixed(3),t&&(e.dirty=!0)}let ce=!(!e.relocTween||e.relocTween.done)||e.cursorMode,le=!(Math.abs(O-e.dX)<Bt&&Math.abs(k-e.dY)<Bt&&Math.abs(A-e.dAng)<Vt&&Math.abs(j-e.dEX)<Bt&&Math.abs(M-e.dEY)<Bt),ue=!(Math.abs(se-e.dHOp)<Ht&&Math.abs(z-e.dEOp)<Ht),de=L!==e.dHaloTint||R!==e.dExtraTint;return e.dirty||le||ue||de?(e.dX=O,e.dY=k,e.dAng=A,e.dEX=j,e.dEY=M,e.dHOp=se,e.dEOp=z,e.dHaloTint=L,e.dExtraTint=R,e.dirty=!1,Zt(e,O,k,A,j,M,se,z,L,R),ce):ce}function Zt(e,t,n,r,i,a,o,s,c,l){let{ctx:u,canvas:d,dpr:f,margin:p}=e;if(u.setTransform(1,0,0,1,0,0),u.globalCompositeOperation=`source-over`,u.globalAlpha=1,u.clearRect(0,0,d.width,d.height),o<=.002&&s<=.002||!e.maskReady)return;let m=o>.002?vt(e.halo,...Qt(c),e.haloTint):null,h=s>.002?l===`#ffffff`?e.extra.canvas:vt(e.extra,...Qt(l),e.extraTint):null,g=c=>{m&&(u.save(),u.translate(t+p,n+p),u.rotate(r),u.globalAlpha=o*c,u.drawImage(m,-e.halo.ax,-e.halo.ay,e.halo.w,e.halo.h),u.restore()),h&&(u.save(),u.translate(i+p,a+p),u.rotate(r),u.globalAlpha=s*c,u.drawImage(h,-e.extra.ax,-e.extra.ay,e.extra.w,e.extra.h),u.restore())};if(!e.pointMode&&e.surroundPath&&e.bandPath){u.save(),u.scale(f,f),u.clip(e.surroundPath,`evenodd`),g(.5),u.restore(),u.save(),u.scale(f,f),u.clip(e.bandPath,`evenodd`),g(1),u.restore();return}u.save(),u.scale(f,f),g(1),u.restore();let _=e.maskAlpha;if(!_)return;let v=u.getImageData(0,0,d.width,d.height),y=v.data;for(let e=0,t=3;e<_.length;e++,t+=4){let n=_[e];if(n!==255){if(n===0){y[t]=0;continue}y[t]=(y[t]*n+127)/255}}u.putImageData(v,0,0)}var $=[255,255,255];function Qt(e){if(e[0]===`#`)return $[0]=parseInt(e.slice(1,3),16),$[1]=parseInt(e.slice(3,5),16),$[2]=parseInt(e.slice(5,7),16),$;let t=4,n=0,r=0;for(;t<e.length&&r<3;){let i=e.charCodeAt(t++);i>=48&&i<=57?n=n*10+(i-48):(i===44||i===41)&&($[r++]=n,n=0)}return $}var $t=`metal-fx-styles`,en=`
.metal-fx-root {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  isolation: isolate;
  overflow: visible;
  background: #272727;
  color: #f8f8f8;
}
.metal-fx-root[data-theme='light'] {
  background: #ffffff;
  color: #1d1d1d;
}

.metal-fx-root::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 2;
  box-shadow: inset 0 0 50px 0 rgba(255, 255, 255, 0.02);
}
.metal-fx-root[data-theme='light']::before {
  box-shadow: inset 0 0 50px 0 rgba(0, 0, 0, 0.02);
}

.metal-fx-root::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 4;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}
.metal-fx-root[data-theme='light']::after {
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
}
/* Circle variant gets a thicker outer rim than the button variant. */
.metal-fx-root[data-variant='circle']::after {
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.1);
}
.metal-fx-root[data-theme='light'][data-variant='circle']::after {
  box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.06);
}

.metal-fx-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: 0;
  pointer-events: none;
  border-radius: inherit;
}

/* The inner spacer — defines the inset geometry where the metal ring meets
   the interior (3 px for Button, 1-2 px for Circle) and carries the Circle dark
   hairline ('box-shadow: inset' rules below). Intentionally transparent so
   the wrapper's background propagates through to the punched shader centre,
   giving consumers a single surface tone to override. See "Single-surface
   background" in the file header for the rationale. */
.metal-fx-inner {
  position: absolute;
  inset: 3px;
  border-radius: inherit;
  z-index: 1;
  pointer-events: none;
}

.metal-fx-root[data-variant='button'][data-shape='pill'] .metal-fx-inner {
  border-radius: calc(var(--mfx-radius, 20px) - 3px);
}
.metal-fx-root[data-variant='button'][data-shape='circle'] .metal-fx-inner {
  border-radius: calc(var(--mfx-radius, 16px) - 3px);
}
.metal-fx-root[data-variant='circle'][data-shape='pill'] .metal-fx-inner {
  inset: 0;
  border-radius: var(--mfx-radius, 20px);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
}
.metal-fx-root[data-variant='circle'][data-shape='circle'] .metal-fx-inner {
  inset: 0;
  border-radius: var(--mfx-radius, 16px);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
}
/* Circle-variant hairline alpha — light mode.
   Source-of-truth: index.html L2261-2267. The 0.45-alpha black inset that
   reads as a single-pixel frame against the dark interior is too heavy
   on a #ffffff inner: it ends up looking like a hard 2-px black ring
   against the iridescent shader. Suppressed entirely (alpha 0) — the
   shader's own iridescent rim already defines the silhouette in light
   mode, so an extra dark hairline only competes with it. The rule is
   kept (rather than deleted) as a tunable hook in case a future variant
   wants to re-introduce a soft edge. NOTE: we keep the dark-mode inset
   and border-radius values because — unlike index.html — our renderer
   does NOT overscan the canvas in light mode, so there is no 1-px gap
   between inner element and shader to compensate for. */
.metal-fx-root[data-theme='light'][data-variant='circle'][data-shape='pill'] .metal-fx-inner,
.metal-fx-root[data-theme='light'][data-variant='circle'][data-shape='circle'] .metal-fx-inner {
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0);
}

/* ─── Combined glow SVG (z=3) ──────────────────────────────────────────────
   Single SVG per instance that holds BOTH the wide-halo group
   (#mfx_haloTravel) and the catch-light group (#mfx_extraTravel), exactly
   mirroring canonical's _buildGlowSvgInner (index.html L8078). One
   mix-blend-mode: screen lifts the combined composite onto the shader
   ring; per-frame opacity attributes on each inner group still drive the
   independent fade-in / fade-out cycles for the halo and the catch-light.

   Why a single SVG: the circle variant anchors halo + catch-light at the same
   perimeter point, so they overlap in the bright zone. Two separately-
   screened SVGs would double-screen the overlap (A + B + C - AB - AC -
   BC + ABC instead of A + B + C - AB - AC once both groups composite
   in source-over inside one SVG and then screen against the host once).
   That overlap looked muted versus canonical specifically on the circle
   variant where both layers travel together.

   Source-of-truth opacity: #btnGlowSvg drops to 0.7 in dark and 0.2746 in
   light (index.html L632/L643). */
.metal-fx-glow-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  z-index: 3;
  pointer-events: none;
  opacity: 0.7;
}
.metal-fx-root[data-theme='light'] .metal-fx-glow-svg {
  /* Light-mode 1-px overscan mirrors .btn-glow-svg in metal.html so the
     halo stays glued to the visible silhouette (the shader ring there sits
     1 px outside the host's padding box). */
  inset: -1px;
  width: calc(100% + 2px);
  height: calc(100% + 2px);
  mix-blend-mode: multiply;
  /* Source-of-truth: html[data-theme="light"] #btnGlowSvg { opacity: 0.2746 }
     → −35 % from 0.4225 from the original 0.7 dark-mode opacity. */
  opacity: 0.2746;
  filter: saturate(5.355) brightness(0.78);
}
/* Circle light-mode small variants (e.g. 36×36 send button): the geometrically
   shrunk halo loses density when multiplied against #ffffff. Mirror the
   canonical override at index.html L2316 — bump saturation + drop brightness
   so the small glow holds together visually. */
.metal-fx-root[data-variant='circle'][data-shape='circle'][data-theme='light'] .metal-fx-glow-svg {
  filter: saturate(7.5) brightness(0.6);
}

/* The wrapped child — hoisted into z=5 so it sits above every overlay, with
   normalized chrome so consumer button styles don't fight the metal frame. */
.metal-fx-content {
  position: relative;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  pointer-events: none;
}
.metal-fx-content > * {
  pointer-events: auto;
}
.metal-fx-root[data-normalize='true'] .metal-fx-content > * {
  background: transparent !important;
  border: 0 !important;
  outline: 0 !important;
  box-shadow: none !important;
  /* Sizing: we deliberately DO NOT force \`width: 100%; height: 100%\` on the
     child here. That used to be the contract ("the wrapper is the visible
     button surface; the child stretches to fill it"), but it created a cyclic
     percentage dependency: the wrapper is \`inline-flex\` with no intrinsic
     size, .metal-fx-content is \`width/height: 100%\` of the wrapper, and the
     child was \`100%\` of .metal-fx-content. With nothing breaking the cycle,
     icon-only / class-sized children collapsed.

     The new contract: the child sizes itself (intrinsic content, CSS class,
     or inline style — all work), and the wrapper's \`inline-flex\` wraps it
     tightly. Consumers who want a metal frame BIGGER than the child (e.g.
     padding around an icon) size <MetalFx style={{ width, height }}> AND
     explicitly set width/height on the child to fill (or accept that the
     child renders at its intrinsic size, centered).

     Typography is intentionally NOT touched. We used to apply
     \`color: inherit; font: inherit;\` here to "match" the wrapper, but
     \`font: inherit\` is a shorthand that overrides font-family, font-size,
     font-weight, AND line-height on the child — which (a) shrank the
     button height (line-height changes propagate through the flex
     content box) and (b) scaled em-based icons / font-icons inside the
     child to whatever the wrapper inherited. The wrapper now stays out
     of the child's typography entirely; consumers who want typographic
     normalization can apply it themselves on the child element. */
}

[data-metal-fx-reflection] {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  overflow: hidden;
  z-index: 0;
  isolation: isolate;
}
.metal-fx-reflection-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  filter: blur(4px) saturate(1.2) brightness(1.58);
}
.metal-fx-reflection-stroke-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  filter: saturate(1.35) brightness(1.75);
}
/* Hosts that participate as reflection targets need positioning + isolation
   so the wrap composites only against the host (not the parent stack). The
   wrap injects these inline as well, but stating them here keeps reflections
   working on hosts that already have other inline styles applied. */
[data-metal-fx-reflect-host] {
  isolation: isolate;
}
`,tn=!1;function nn(){if(tn||typeof document>`u`)return;if(document.getElementById($t)){tn=!0;return}let e=document.createElement(`style`);e.id=$t,e.textContent=en,document.head.appendChild(e),tn=!0}var rn=[...document.querySelectorAll(`[data-metal]`)].filter(e=>e.getClientRects().length),an=e=>e.classList.contains(`new`);if(rn.length&&m()){nn();let e=matchMedia(`(prefers-reduced-motion: reduce)`),t=matchMedia(`(prefers-color-scheme: dark)`),n=()=>document.documentElement.dataset.theme===`dark`||!document.documentElement.dataset.theme&&t.matches?`dark`:`light`,r=new Map;ae((e,t)=>{let i=r.get(e);return i?Xt(i,e,t,e.opacityMul*e.glowGain,n()):!1}),F(`chromatic`,n());let i=[];for(let t of rn){let a=document.createElement(`span`);a.className=`metal-fx-root`,a.dataset.variant=`button`,a.dataset.shape=`pill`,a.dataset.theme=n(),a.dataset.normalize=`true`,a.style.opacity=`0`,a.style.visibility=`hidden`;let o=document.createElement(`canvas`);o.className=`metal-fx-canvas`,o.style.cssText=`position:absolute;inset:0;width:100%;height:100%`;let s=document.createElement(`span`);s.className=`metal-fx-inner`,s.setAttribute(`aria-hidden`,`true`),s.style.cssText=`position:absolute;inset:3px`;let c=document.createElement(`span`);c.setAttribute(`aria-hidden`,`true`),c.style.cssText=`position:absolute;inset:0;pointer-events:none;z-index:3;border-radius:inherit`;let l=document.createElement(`span`);l.className=`metal-fx-content`;let u=an(t);if(u){a.dataset.badge=``;let e=document.createElement(`span`);e.className=`mfx-badge`;let n=document.createElement(`span`);n.className=`mfx-core`,n.setAttribute(`aria-hidden`,`true`);let r=document.createElement(`span`);r.className=`mfx-rims`,r.setAttribute(`aria-hidden`,`true`),t.replaceWith(a),e.append(n,r,t),l.append(e),a.append(o,s,c,l),t.style.background=`none`,t.style.color=`#323232`,t.style.margin=`0`}else{let e=getComputedStyle(t).margin;t.replaceWith(a),l.append(t),a.append(o,s,c,l),a.style.margin=e,t.style.margin=`0`}u||(t.style.color=`inherit`),u&&Object.assign(t.style,{display:`inline-flex`,alignItems:`center`,padding:`0 8px`,borderRadius:`999px`,fontSize:`var(--fs-s)`,lineHeight:`var(--lh-s)`,height:`22px`});let d=t.getBoundingClientRect(),f=Math.max(1,Math.round(d.width)),p=Math.max(1,Math.round(d.height)),m=u?p/2:Math.min(parseFloat(getComputedStyle(t).borderTopLeftRadius)||p/2,p/2),h=null,g=j({hostCanvas:o,cssWidth:f,cssHeight:p,cornerRadius:m,kind:`pill`,paused:e.matches,...u?{shaderScale:1.6,mask:(e,t,n,r)=>{e.beginPath(),e.roundRect(0,0,t,n,m*r),e.fill()}}:{ringCssPx:2,shaderScale:1.3},onComposite:()=>{h&&Yt(h,g.deform)},onFirstCopy:()=>{a.style.transition=`opacity .15s ease-out`,a.style.opacity=`1`,a.style.visibility=`visible`}});a.style.borderRadius=`${m}px`,a.style.setProperty(`--mfx-radius`,`${m}px`),h=Gt(c,{width:f,height:p,cornerRadius:m,kind:`pill`,scale:1}),r.set(g,h),M(g);let _=()=>t.matches(`:disabled`)?.25:u?.8:1;N(g,{opacityMul:_()}),a.toggleAttribute(`data-off`,t.matches(`:disabled`)),new MutationObserver(()=>{N(g,{opacityMul:_()}),a.toggleAttribute(`data-off`,t.matches(`:disabled`))}).observe(t,{attributes:!0,attributeFilter:[`disabled`]}),new IntersectionObserver(e=>e.forEach(e=>ie(g,e.isIntersecting)),{rootMargin:`64px`}).observe(a),new ResizeObserver(()=>{let e=t.getBoundingClientRect(),n=Math.round(e.width),i=Math.round(e.height);if(!n||!i||Math.abs(n-g.cssWidth)<1&&Math.abs(i-g.cssHeight)<1)return;let o=u?i/2:Math.min(parseFloat(getComputedStyle(t).borderTopLeftRadius)||i/2,i/2);N(g,{cssWidth:n,cssHeight:i,cornerRadius:o}),a.style.borderRadius=`${o}px`,a.style.setProperty(`--mfx-radius`,`${o}px`),c.textContent=``,h=Gt(c,{width:n,height:i,cornerRadius:o,kind:`pill`,scale:1}),r.set(g,h)}).observe(t),i.push({root:a,inst:g})}let a=document.createElement(`style`);a.textContent=`.metal-fx-root[data-theme='light']:not([data-badge]){ background:#1d1d1d; color:#fff; }
    .metal-fx-root[data-badge]{ background:#fff; margin-left:8px; vertical-align:middle; }
    .mfx-badge{ position:relative; display:inline-flex; border-radius:999px; overflow:hidden; }
    .mfx-core, .mfx-rims{ position:absolute; inset:0; border-radius:inherit; pointer-events:none; }
    .mfx-core{ background:radial-gradient(ellipse 49% 49% at 50% 50%, #fff 46%, rgba(255,255,255,0) 100%); opacity:.94; }
    .mfx-rims{ box-shadow:inset 0 0 8px rgba(255,255,255,.41), inset 0 0 8px rgba(255,255,255,.41), inset 0 0 0 .8px rgba(255,255,255,.5), inset 0 .8px 0 rgba(255,255,255,.78); }
    .mfx-badge > .new{ position:relative; font-weight:500; }`,document.head.append(a),Fe();let o=()=>{let e=n();F(`chromatic`,e),i.forEach(t=>t.root.dataset.theme=e)};t.addEventListener(`change`,o),new MutationObserver(o).observe(document.documentElement,{attributes:!0,attributeFilter:[`data-theme`,`class`]}),e.addEventListener(`change`,()=>i.forEach(t=>N(t.inst,{paused:e.matches})))}