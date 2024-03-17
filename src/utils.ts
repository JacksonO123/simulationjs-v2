import { mat4, vec2, vec3, vec4 } from 'wgpu-matrix';
import { SimulationElement, SplinePoint2d } from './graphics.js';
import { Vector2, Vector3, Vector4 } from './types.js';
import { Camera } from './simulation.js';
import { BUF_LEN } from './constants.js';

export class Color {
  r: number; // 0 - 255
  g: number; // 0 - 255
  b: number; // 0 - 255
  a: number; // 0.0 - 1.0

  constructor(r = 0, g = 0, b = 0, a = 1) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  clone() {
    return new Color(this.r, this.g, this.b, this.a);
  }

  toBuffer() {
    return [this.r / 255, this.g / 255, this.b / 255, this.a] as const;
  }

  toVec4() {
    return vector4(this.r, this.g, this.b, this.a);
  }

  toObject() {
    return {
      r: this.r / 255,
      g: this.g / 255,
      b: this.b / 255,
      a: this.a
    };
  }

  diff(color: Color) {
    return new Color(this.r - color.r, this.g - color.g, this.b - color.b, this.a - color.a);
  }
}

export class VertexCache {
  private vertices: number[] = [];
  private hasUpdated = true;

  constructor() {}

  setCache(vertices: number[]) {
    this.vertices = vertices;
    this.hasUpdated = false;
  }

  getCache() {
    return this.vertices;
  }

  updated() {
    this.hasUpdated = true;
  }

  shouldUpdate() {
    return this.hasUpdated;
  }

  getVertexCount() {
    return this.vertices.length / BUF_LEN;
  }
}

export class Vertex {
  private pos: Vector3;
  private color: Color | null;
  private is3d: boolean;
  private uv: Vector2;

  constructor(x = 0, y = 0, z = 0, color?: Color, is3dPoint = true, uv = vector2()) {
    this.pos = vector3(x, y, z);
    this.color = color ? color : null;
    this.is3d = is3dPoint;
    this.uv = uv;
  }

  getPos() {
    return this.pos;
  }

  setPos(pos: Vector3) {
    this.pos = pos;
  }

  getColor() {
    return this.color;
  }

  setColor(color: Color) {
    this.color = color;
  }

  getUv() {
    return this.uv;
  }

  setUv(uv: Vector2) {
    this.uv = uv;
  }

  setX(x: number) {
    this.pos[0] = x;
  }

  setY(y: number) {
    this.pos[1] = y;
  }

  setZ(z: number) {
    this.pos[2] = z;
  }

  setIs3d(is3d: boolean) {
    this.is3d = is3d;
  }

  clone() {
    return new Vertex(
      this.pos[0],
      this.pos[1],
      this.pos[2],
      this.color?.clone(),
      this.is3d,
      cloneBuf(this.uv)
    );
  }

  toBuffer(defaultColor: Color) {
    if (this.is3d)
      return vertexBuffer3d(this.pos[0], this.pos[1], this.pos[2], this.color || defaultColor, this.uv);
    else return vertexBuffer2d(this.pos[0], this.pos[1], this.color || defaultColor, this.uv);
  }
}

export const buildProjectionMatrix = (aspectRatio: number, zNear = 1, zFar = 500) => {
  const fov = (2 * Math.PI) / 5;

  return mat4.perspective(fov, aspectRatio, zNear, zFar);
};

export const getTransformationMatrix = (pos: Vector3, rotation: Vector3, projectionMatrix: mat4) => {
  const modelViewProjectionMatrix = mat4.create();

  const viewMatrix = mat4.identity();

  const camPos = vector3();

  vec3.clone(pos, camPos);
  vec3.scale(camPos, -1, camPos);

  mat4.rotateZ(viewMatrix, rotation[2], viewMatrix);
  mat4.rotateY(viewMatrix, rotation[1], viewMatrix);
  mat4.rotateX(viewMatrix, rotation[0], viewMatrix);

  mat4.translate(viewMatrix, camPos, viewMatrix);

  mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);

  return modelViewProjectionMatrix as Float32Array;
};

export const getOrthoMatrix = (screenSize: [number, number]) => {
  return mat4.ortho(0, screenSize[0], 0, screenSize[1], 0, 100) as Float32Array;
};

export const buildMultisampleTexture = (
  device: GPUDevice,
  ctx: GPUCanvasContext,
  width: number,
  height: number
) => {
  return device.createTexture({
    size: [width, height],
    format: ctx.getCurrentTexture().format,
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
    sampleCount: 4
  });
};

export const applyElementToScene = (
  scene: SimulationElement[],
  camera: Camera | null,
  el: SimulationElement
) => {
  if (!camera) throw logger.error('Camera is not initialized in element');

  if (el instanceof SimulationElement) {
    el.setCamera(camera);
    scene.push(el);
  } else {
    throw logger.error('Cannot add invalid SimulationElement');
  }
};

class Logger {
  constructor() {}

  private fmt(msg: string) {
    return `SimJS: ${msg}`;
  }

  log(msg: string) {
    console.log(this.fmt(msg));
  }
  error(msg: string) {
    return new Error(this.fmt(msg));
  }
  warn(msg: string) {
    console.warn(this.fmt(msg));
  }
  log_error(msg: string) {
    console.error(this.fmt(msg));
  }
}

export const logger = new Logger();

// optomized for speed, depending on orientation of vertices as input, shape may not be preserved
export function lossyTriangulate(vertices: Vertex[]) {
  const res: (readonly [Vertex, Vertex, Vertex])[] = [];

  let facingRight = true;
  let rightOffset = 0;
  let leftOffset = 0;

  while (rightOffset < vertices.length - leftOffset - 2) {
    if (facingRight) {
      const triangle = [
        vertices[rightOffset],
        vertices[rightOffset + 1],
        vertices[vertices.length - leftOffset - 1]
      ] as const;
      res.push(triangle);

      rightOffset++;
    } else {
      const triangle = [
        vertices[rightOffset],
        vertices[vertices.length - leftOffset - 1],
        vertices[vertices.length - leftOffset - 2]
      ] as const;
      res.push(triangle);

      leftOffset++;
    }

    facingRight = !facingRight;
  }

  return res;
}

/**
 * @param callback1 - called every frame until the animation is finished
 * @param callback2 - called after animation is finished (called immediately when t = 0)
 * @param t - animation time (seconds)
 * @returns {Promise<void>}
 */
export function transitionValues(
  callback1: (deltaT: number, t: number) => void,
  callback2: () => void,
  transitionLength: number,
  func?: (n: number) => number
): Promise<void> {
  return new Promise((resolve) => {
    if (transitionLength == 0) {
      callback2();
      resolve();
    } else {
      let prevPercent = 0;
      let prevTime = Date.now();
      const step = (t: number, f: (n: number) => number) => {
        const newT = f(t);
        callback1(newT - prevPercent, t);
        prevPercent = newT;
        const now = Date.now();
        let diff = now - prevTime;
        diff = diff === 0 ? 1 : diff;
        const fpsScale = 1 / diff;
        const inc = 1 / (1000 * fpsScale * transitionLength);
        prevTime = now;
        if (t < 1) {
          window.requestAnimationFrame(() => step(t + inc, f));
        } else {
          callback2();
          resolve();
        }
      };
      step(0, func ? func : linearStep);
    }
  });
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function smoothStep(t: number) {
  const v1 = t * t;
  const v2 = 1 - (1 - t) * (1 - t);
  return lerp(v1, v2, t);
}

export function linearStep(n: number) {
  return n;
}

export function vertexBuffer3d(x: number, y: number, z: number, color: Color, uv = vector2()) {
  return [x, y, z, 1, ...color.toBuffer(), ...uv, 1];
}

export function vertexBuffer2d(x: number, y: number, color: Color, uv = vector2()) {
  return [x, y, 0, 1, ...color.toBuffer(), ...uv, 0];
}

export function vec3ToPixelRatio(vec: Vector3) {
  vec3.mul(vec, vector3(devicePixelRatio, devicePixelRatio, devicePixelRatio), vec);
}

export function cloneBuf<T extends Float32Array>(buf: T) {
  return new Float32Array(buf) as T;
}

export function vector4(x = 0, y = 0, z = 0, w = 0): Vector4 {
  return vec4.fromValues(x, y, z, w);
}

export function vector3(x = 0, y = 0, z = 0): Vector3 {
  return vec3.fromValues(x, y, z);
}

export function vector2(x = 0, y = 0): Vector2 {
  return vec2.fromValues(x, y);
}

export function vector3FromVector2(vec: Vector2): Vector3 {
  return vector3(vec[0], vec[1]);
}

export function vector2FromVector3(vec: Vector3): Vector2 {
  return vector2(vec[0], vec[1]);
}

export function colorFromVector4(vec: Vector4) {
  return new Color(vec[0], vec[1], vec[2], vec[3]);
}

export function randomInt(range: number, min = 0) {
  return Math.floor(Math.random() * (range - min)) + min;
}

export function randomColor(a = 1) {
  return new Color(randomInt(255), randomInt(255), randomInt(255), a);
}

export function vertex(x?: number, y?: number, z?: number, color?: Color, is3dPoint?: boolean, uv?: Vector2) {
  return new Vertex(x, y, z, color, is3dPoint, uv);
}

export function color(r?: number, g?: number, b?: number, a?: number) {
  return new Color(r, g, b, a);
}

export function colorf(val: number, a?: number) {
  return color(val, val, val, a);
}

export function splinePoint2d(end: Vertex, control1: Vector2, control2: Vector2, detail?: number) {
  vec2.scale(control1, devicePixelRatio, control1);
  vec2.scale(control2, devicePixelRatio, control2);
  vec2.scale(end.getPos(), devicePixelRatio, end.getPos());

  const rawControls: [Vector2, Vector2] = [cloneBuf(control1), cloneBuf(control2)];

  vec2.add(end.getPos(), control2, control2);

  return new SplinePoint2d(null, end, control1, control2, rawControls, detail);
}

export function continuousSplinePoint2d(end: Vertex, control: Vector2, detail?: number) {
  vec2.scale(control, devicePixelRatio, control);
  vec2.scale(end.getPos(), devicePixelRatio, end.getPos());

  const rawControls: [Vector2, Vector2] = [vector2(), cloneBuf(control)];

  vec2.add(end.getPos(), control, control);

  return new SplinePoint2d(null, end, null, control, rawControls, detail);
}

export function interpolateColors(colors: Color[], t: number) {
  const colorInterval = 1 / colors.length;
  let index = Math.floor(t / colorInterval);

  if (index === colors.length) index--;

  const from = index === colors.length - 1 ? colors[index - 1] : colors[index];
  const to = index === colors.length - 1 ? colors[index] : colors[index + 1];

  const diff = to.diff(from);

  diff.r *= t / (colorInterval * colors.length);
  diff.g *= t / (colorInterval * colors.length);
  diff.b *= t / (colorInterval * colors.length);
  diff.a *= t / (colorInterval * colors.length);

  const res = from.clone();

  res.r += diff.r;
  res.g += diff.g;
  res.b += diff.b;
  res.a += diff.a;

  return res;
}
