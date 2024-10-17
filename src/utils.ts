import { mat4, vec2, vec3, vec4 } from 'wgpu-matrix';
import { SimulationElement3d, SplinePoint2d } from './graphics.js';
import { FloatArray, Mat4, Vector2, Vector2m, Vector3, Vector3m, Vector4 } from './types.js';
import { Shader } from './shaders.js';
import { globalInfo } from './globals.js';
import { orthogonalMatrix, worldProjectionMatrix } from './simulation.js';
import { worldProjMatOffset } from './constants.js';

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

  static fromVec4(vec: Vector4) {
    return new Color(vec[0], vec[1], vec[2], vec[3]);
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

  isTransparent() {
    return this.a < 1;
  }

  setValues(color: Color) {
    this.r = color.r;
    this.g = color.g;
    this.b = color.b;
    this.a = color.a;
  }
}

export class Vertex {
  private pos: Vector3;
  private color: Color | null;
  private uv: Vector2;

  constructor(x = 0, y = 0, z = 0, color?: Color, uv = vector2()) {
    this.pos = vector3(x, y, z);
    this.color = color ?? null;
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

  clone() {
    return new Vertex(this.pos[0], this.pos[1], this.pos[2], this.color?.clone(), cloneBuf(this.uv));
  }
}

/**
 * @param onFrame - called every frame until the animation is finished
 * @param adjustment - called after animation is finished (called immediately when t = 0) if t > 0 it will only be called if `transformAdjustments` is enabled in settings
 * @param t - animation time (seconds)
 * @returns {Promise<void>}
 */
export function transitionValues(
  onFrame: (deltaT: number, t: number, total: number) => void,
  adjustment: () => void,
  transitionLength: number,
  func?: (n: number) => number
): Promise<void> {
  return new Promise((resolve) => {
    if (transitionLength == 0) {
      adjustment();
      resolve();
    } else {
      let prevPercent = 0;
      let prevTime = Date.now();
      let totalTime = 0;

      const step = (t: number, f: (n: number) => number) => {
        const newT = f(t);
        const deltaT = newT - prevPercent;

        onFrame(deltaT, t, totalTime);
        totalTime += deltaT;
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
          adjustment();
          resolve();
        }
      };
      step(0, func ? func : linearStep);
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Shift<T extends any[]> = T extends [] ? [] : T extends [unknown, ...infer R] ? R : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function frameLoop<T extends (dt: number, ...args: any[]) => any>(
  cb: T
): (...params: Shift<Parameters<T>>) => void {
  let prevFrame = 0;
  let prevTime = 0;
  function start(dt: number, ...args: Shift<Parameters<T>>) {
    let res = cb(dt, ...args);
    if (res === false) {
      window.cancelAnimationFrame(prevFrame);
      return;
    }
    if (!Array.isArray(res)) res = args;
    const now = Date.now();
    const diff = now - prevTime;
    prevTime = now;
    prevFrame = window.requestAnimationFrame(() => start(diff, ...res));
  }
  return (...p: Shift<Parameters<T>>) => {
    prevTime = Date.now();
    start(0, ...p);
  };
}

export function clamp(num: number, min: number, max: number) {
  return Math.min(max, Math.max(min, num));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function smoothStep(t: number) {
  const v1 = t * t;
  const v2 = 1 - (1 - t) * (1 - t);
  return lerp(v1, v2, t);
}

export function linearStep(t: number) {
  return t;
}

export function easeInOutExpo(t: number) {
  return t === 0
    ? 0
    : t === 1
      ? 1
      : t < 0.5
        ? Math.pow(2, 20 * t - 10) / 2
        : (2 - Math.pow(2, -20 * t + 10)) / 2;
}

export function easeInOutQuart(t: number) {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

export function easeInOutQuad(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function easeInQuad(x: number) {
  return x * x;
}

export function easeOutQuad(x: number) {
  return 1 - (1 - x) * (1 - x);
}

export function easeInQuart(x: number) {
  return x * x * x * x;
}

export function easeOutQuart(x: number) {
  return 1 - Math.pow(1 - x, 4);
}

export function easeInExpo(x: number) {
  return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
}

export function easeOutExpo(x: number) {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
}

export function cloneBuf<T extends FloatArray>(buf: T) {
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

export function matrix4(): Mat4 {
  return mat4.identity();
}

export function vector3FromVector2(vec: Vector2): Vector3 {
  return vector3(vec[0], vec[1]);
}

export function vector2FromVector3(vec: Vector3): Vector2 {
  return vector2(vec[0], vec[1]);
}

export function randomInt(max: number, min = 0) {
  return Math.floor(Math.random() * (max - min)) + min;
}

export function randomColor(a = 1) {
  return new Color(randomInt(255), randomInt(255), randomInt(255), a);
}

export function vertex(x?: number, y?: number, z?: number, color?: Color, uv?: Vector2) {
  return new Vertex(x, y, z, color, uv);
}

export function color(r?: number, g?: number, b?: number, a?: number) {
  return new Color(r, g, b, a);
}

export function colorf(val: number, a?: number) {
  return color(val, val, val, a);
}

export function splinePoint2d(end: Vertex, control1: Vector2, control2: Vector2, detail?: number) {
  const rawControls: [Vector2, Vector2] = [cloneBuf(control1), cloneBuf(control2)];

  vec2.add(end.getPos(), control2, control2);

  return new SplinePoint2d(null, end, control1, control2, rawControls, detail);
}

export function continuousSplinePoint2d(end: Vertex, control: Vector2, detail?: number) {
  const rawControls: [Vector2, Vector2] = [vector2(), cloneBuf(control)];

  vec2.add(end.getPos(), control, control);

  return new SplinePoint2d(null, end, null, control, rawControls, detail);
}

/**
 * @param t - seconds
 */
export function waitFor(t: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, t * 1000);
  });
}

export function distance2d(vector1: Vector2m, vector2: Vector2m): number {
  return vec2.distance(vector1, vector2);
}

export function distance3d(vector1: Vector3m, vector2: Vector3m): number {
  return vec3.distance(vector1, vector2);
}

export function interpolateColors(colors: Color[], t: number) {
  t = Math.min(1, Math.max(0, t));

  if (colors.length === 0) return color();
  if (colors.length === 1) return colors[0];

  const colorInterval = 1 / colors.length;
  let index = Math.floor(t / colorInterval);

  if (index >= colors.length) index = colors.length - 1;

  const from = index === colors.length - 1 ? colors[index - 1] : colors[index];
  const to = index === colors.length - 1 ? colors[index] : colors[index + 1];

  const diff = to.diff(from);
  const scale = t / (colorInterval * colors.length);

  diff.r *= scale;
  diff.g *= scale;
  diff.b *= scale;
  diff.a *= scale;

  const res = from.clone();

  res.r += diff.r;
  res.g += diff.g;
  res.b += diff.b;
  res.a += diff.a;

  return res;
}

export function vectorsToVertex(vectors: Vector3[]) {
  return vectors.map((vec) => vertex(...vec));
}

export function cloneVectors(vectors: Vector3[]) {
  return vectors.map((vec) => cloneBuf(vec));
}

export function createBindGroup(shader: Shader, bindGroupIndex: number, buffers: GPUBuffer[]) {
  const device = globalInfo.errorGetDevice();
  const layout = shader.getBindGroupLayouts()[bindGroupIndex];

  return device.createBindGroup({
    layout: layout,
    entries: buffers.map((buffer, index) => ({
      binding: index,
      resource: {
        buffer
      }
    }))
  });
}

export function writeUniformWorldMatrix(el: SimulationElement3d) {
  const device = globalInfo.errorGetDevice();
  const uniformBuffer = el.getUniformBuffer();

  const projBuf = el.is3d ? worldProjectionMatrix : orthogonalMatrix;
  device.queue.writeBuffer(
    uniformBuffer,
    worldProjMatOffset,
    projBuf.buffer,
    projBuf.byteOffset,
    projBuf.byteLength
  );
}
