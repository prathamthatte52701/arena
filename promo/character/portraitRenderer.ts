import type { FaceFrame } from '../face/controller';
import type { PortraitProfile } from '../characters/types.ts';

// One 2D texture, no scene, geometry model, lighting model or generated face.
// Inverse texture coordinates keep the original skin, lashes and iris pixels.
const vertex = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = vec2(position.x * .5 + .5, .5 - position.y * .5);
  gl_Position = vec4(position, 0., 1.);
}`;
const fragment = `
precision highp float;
varying vec2 uv;
uniform sampler2D portrait;
uniform vec2 size;
uniform vec2 eyeA;
uniform vec2 eyeB;
uniform vec2 gaze;
uniform vec4 pose; // head angle, chin, brow, squint
uniform vec4 life; // head drift x/y, breath, posture
uniform vec3 expression; // smile, asymmetry, blink
uniform vec4 mouth; // open, width, compression, round
uniform vec3 mouthDetail; // lower lip, jaw drop, corner pull

float region(vec2 p, vec2 center, vec2 radius) {
  vec2 d = (p-center)/radius;
  return 1. - smoothstep(.12, 1., dot(d,d));
}
vec2 eye(vec2 p, vec2 center) {
  float x = p.x-center.x;
  float y = p.y-center.y;
  float width = 1.-smoothstep(30.,56.,abs(x));
  float closure = expression.z + (1.-expression.z)*pose.w;
  // Resample the upper lid skin downward and lower lid upward. The eye
  // aperture collapses between them; no coloured rectangle is composited.
  float top = -15.;
  float bottom = 15.;
  float upper = top + 22.*closure;
  float lower = bottom - 8.*closure;
  float mapped = y;
  if (y > -45. && y < upper) mapped = mix(-45.,top,(y+45.)/(upper+45.));
  else if (y >= upper && y <= lower) mapped = mix(top,bottom,(y-upper)/max(.001,lower-upper));
  else if (y > lower && y < 41.) mapped = mix(bottom,41.,(y-lower)/(41.-lower));
  p.y += (mapped-y)*width;
  // Only iris/sclera interior shifts; canthi, lashes and eye outline stay put.
  float inside = region(p,center,vec2(40.,15.5));
  p -= gaze*inside;
  return p;
}
void main() {
  vec2 p = uv*size;
  float headWeight = 1.-smoothstep(745.,940.,p.y);
  vec2 pivot = vec2(561.,790.);
  float angle = -(pose.x+life.x*.16)*.0174533*headWeight;
  vec2 d = p-pivot;
  p = pivot + mat2(cos(angle),sin(angle),-sin(angle),cos(angle))*d;
  p -= vec2(life.x,life.y+pose.y)*headWeight;
  float shoulders = smoothstep(745.,1080.,p.y);
  p.y += (life.z+life.w)*shoulders;
  p.x = 561. + (p.x-561.)/(1.+life.z*.0006*shoulders);
  // Small, feathered brow offsets; never scale the full face.
  p.y -= pose.z*region(p,vec2(445.,371.),vec2(72.,32.));
  p.y -= (pose.z+expression.y*1.4)*region(p,vec2(636.,371.),vec2(72.,32.));
  // A closed-mouth smile is asymmetric at the corners, limited to a few pixels.
  p.y += expression.x*(1.-expression.y*.65)*region(p,vec2(482.,630.),vec2(52.,38.));
  p.y += expression.x*(1.+expression.y*.55)*region(p,vec2(622.,630.),vec2(52.,38.));
  // Split the original seam into independent upper/lower lip edges.
  vec2 center = vec2(552.,633.);
  // Horizontal width/rounding must stop before the cheek. The former 134x58
  // influence ellipse still sampled the source seam beyond the real corners.
  float local = region(p, center, vec2(96.,38.));
  float widthScale = clamp(1. + mouth.y*.35 - mouth.w*.37,.62,1.12);
  p.x = center.x + (p.x-center.x)/mix(1.,widthScale,local);
  // The cavity belongs inside the lipstick silhouette; the wider lip ROI below
  // may still compress/round the lips without turning cheek pixels into seam.
  float x = (p.x-center.x)/70.;
  float arch = max(0., 1.-x*x);
  // Fade every vertical seam remap before the real lip corners. Without this
  // horizontal envelope, even a sub-pixel blended opening samples the dark
  // source seam all the way to abs(x) == 1 and produces a cheek-facing spike.
  float corner = smoothstep(.12,.52,arch);
  float seam = 633. - 3.*x*x;
  float opening = mouth.x*54.*pow(arch,1.15);
  float top = seam-opening*.32;
  float bottom = seam+opening*.68;
  float y = p.y;
  float interior = 0.;
  if (abs(x)<1. && opening>.01 && y>=top && y<=bottom) {
    // Expand source seam pixels into the cavity, preserving texture variation.
    float depth = (y-top)/max(opening,.001);
    float cavityY = seam + (depth-.5)*1.2;
    float verticalFeather = min(4.,max(.6,opening*.24));
    float cavity = smoothstep(0.,verticalFeather,y-top)*smoothstep(0.,verticalFeather,bottom-y)*corner;
    p.y = mix(y,cavityY,cavity);
    interior = cavity;
  } else if (y<top && y>560.) {
    float upperY = mix(560.,seam,(y-560.)/(top-560.));
    p.y = mix(y,upperY,corner);
  } else if (y>bottom && y<740.) {
    float lowerY = mix(seam,740.,(y-bottom)/(740.-bottom));
    p.y = mix(y,lowerY,corner);
  }
  float lip = region(p,center,vec2(98.,34.))*smoothstep(.1,.4,arch);
  p.y = seam+(p.y-seam)*(1.+mouth.z*.65*lip);
  p.y += mouthDetail.x*12.*region(p,vec2(552.,658.),vec2(83.,28.));
  p.y -= mouthDetail.y*4.*region(p,vec2(552.,710.),vec2(120.,52.));
  p = eye(p,eyeA);
  p = eye(p,eyeB);
  gl_FragColor = texture2D(portrait,clamp(p/size,vec2(.001),vec2(.999)));
  gl_FragColor.rgb *= 1.-interior*.62;
}`;

export function createPortraitRenderer(canvas: HTMLCanvasElement, image: HTMLImageElement, profile: PortraitProfile) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('The portrait rig needs WebGL texture support.');
  const shaders: WebGLShader[] = [];
  function compile(type: number, source: string) {
    const shader = gl!.createShader(type);
    if (!shader) throw new Error('Cannot allocate portrait shader.');
    gl!.shaderSource(shader, source);
    gl!.compileShader(shader);
    if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
      const message = gl!.getShaderInfoLog(shader);
      gl!.deleteShader(shader);
      throw new Error(message ?? 'Portrait shader failed.');
    }
    shaders.push(shader);
    return shader;
  }
  const program = gl.createProgram();
  if (!program) throw new Error('Cannot allocate portrait renderer.');
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Portrait shader link failed.');
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  const gaze = uniform('gaze'), pose = uniform('pose'), life = uniform('life'), expression = uniform('expression');
  const mouth = uniform('mouth'), mouthDetail = uniform('mouthDetail');
  gl.uniform1i(uniform('portrait'), 0);
  gl.uniform2f(uniform('size'), profile.width, profile.height);
  gl.uniform2f(uniform('eyeA'), profile.eyes[0].x, profile.eyes[0].y);
  gl.uniform2f(uniform('eyeB'), profile.eyes[1].x, profile.eyes[1].y);
  gl.viewport(0, 0, canvas.width, canvas.height);
  return {
    draw(frame: FaceFrame) {
      gl.uniform2f(gaze, frame.gazeX, frame.gazeY);
      gl.uniform4f(pose, frame.pose.head, frame.pose.chin, frame.pose.brow, frame.pose.squint);
      gl.uniform4f(life, frame.headX, frame.headY, frame.breath, frame.pose.posture);
      gl.uniform3f(expression, frame.pose.smile, frame.pose.asymmetry, frame.blink);
      gl.uniform4f(mouth, frame.mouth.mouthOpen, frame.mouth.mouthWidth, frame.mouth.lipCompress, frame.mouth.lipRound);
      gl.uniform3f(mouthDetail, frame.mouth.lowerLip, frame.mouth.jawDrop, frame.mouth.cornerPull);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    },
    dispose() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      shaders.forEach(shader => gl.deleteShader(shader));
    },
  };
}
