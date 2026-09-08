import type { FaceFrame } from '../face/controller';
import { rheaProfile } from './rheaProfile';

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

float region(vec2 p, vec2 center, vec2 radius) {
  vec2 d = (p-center)/radius;
  return 1. - smoothstep(.12, 1., dot(d,d));
}
vec2 eye(vec2 p, vec2 center) {
  float x = p.x-center.x;
  float y = p.y-center.y;
  float width = 1.-smoothstep(23.,42.,abs(x));
  float closure = expression.z + (1.-expression.z)*pose.w;
  // Resample the upper lid skin downward and lower lid upward. The eye
  // aperture collapses between them; no coloured rectangle is composited.
  float top = -13.;
  float bottom = 13.;
  float upper = top + 19.*closure;
  float lower = bottom - 7.*closure;
  float mapped = y;
  if (y > -38. && y < upper) mapped = mix(-38.,top,(y+38.)/(upper+38.));
  else if (y >= upper && y <= lower) mapped = mix(top,bottom,(y-upper)/max(.001,lower-upper));
  else if (y > lower && y < 35.) mapped = mix(bottom,35.,(y-lower)/(35.-lower));
  p.y += (mapped-y)*width;
  // Only iris/sclera interior shifts; canthi, lashes and eye outline stay put.
  float inside = region(p,center,vec2(32.,12.5));
  p -= gaze*inside;
  return p;
}
void main() {
  vec2 p = uv*size;
  float headWeight = 1.-smoothstep(650.,820.,p.y);
  vec2 pivot = vec2(350.,690.);
  float angle = -(pose.x+life.x*.16)*.0174533*headWeight;
  vec2 d = p-pivot;
  p = pivot + mat2(cos(angle),sin(angle),-sin(angle),cos(angle))*d;
  p -= vec2(life.x,life.y+pose.y)*headWeight;
  float shoulders = smoothstep(650.,950.,p.y);
  p.y += (life.z+life.w)*shoulders;
  p.x = 327. + (p.x-327.)/(1.+life.z*.0006*shoulders);
  // Small, feathered brow offsets; never scale the full face.
  p.y -= pose.z*region(p,vec2(294.,329.),vec2(55.,28.));
  p.y -= (pose.z+expression.y*1.4)*region(p,vec2(429.,326.),vec2(55.,28.));
  // A closed-mouth smile is asymmetric at the corners, limited to a few pixels.
  p.y += expression.x*(1.-expression.y*.65)*region(p,vec2(302.,546.),vec2(39.,34.));
  p.y += expression.x*(1.+expression.y*.55)*region(p,vec2(423.,546.),vec2(36.,34.));
  p = eye(p,eyeA);
  p = eye(p,eyeB);
  gl_FragColor = texture2D(portrait,clamp(p/size,vec2(.001),vec2(.999)));
}`;

export function createPortraitRenderer(canvas: HTMLCanvasElement, image: HTMLImageElement) {
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
  gl.uniform1i(uniform('portrait'), 0);
  gl.uniform2f(uniform('size'), rheaProfile.width, rheaProfile.height);
  gl.uniform2f(uniform('eyeA'), rheaProfile.eyes[0].x, rheaProfile.eyes[0].y);
  gl.uniform2f(uniform('eyeB'), rheaProfile.eyes[1].x, rheaProfile.eyes[1].y);
  gl.viewport(0, 0, canvas.width, canvas.height);
  return {
    draw(frame: FaceFrame) {
      gl.uniform2f(gaze, frame.gazeX, frame.gazeY);
      gl.uniform4f(pose, frame.pose.head, frame.pose.chin, frame.pose.brow, frame.pose.squint);
      gl.uniform4f(life, frame.headX, frame.headY, frame.breath, frame.pose.posture);
      gl.uniform3f(expression, frame.pose.smile, frame.pose.asymmetry, frame.blink);
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
