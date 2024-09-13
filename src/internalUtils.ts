import { mat4, vec3 } from 'wgpu-matrix';
import { Mat4, Vector2, Vector3, SimulationElementInfo } from './types.js';
import { cloneBuf, transitionValues } from './utils.js';
import { SimulationElement3d } from './graphics.js';
import { camera } from './simulation.js';
import { settings } from './settings.js';
import { Shader, defaultShader } from './shaders.js';

export class VertexCache {
  private vertices: Float32Array;
  private hasUpdated = true;

  constructor() {
    this.vertices = new Float32Array();
  }

  setCache(vertices: Float32Array | number[]) {
    this.vertices = Array.isArray(vertices) ? new Float32Array(vertices) : vertices;
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
    return this.vertices.length / defaultShader.getBufferLength();
  }
}

export class CachedArray<T> {
  length: number;
  private data: T[];

  constructor() {
    this.length = 0;
    this.data = [];
  }

  add(index: T) {
    if (this.length < this.data.length) {
      this.data[this.length - 1] = index;
    } else {
      this.data.push(index);
    }

    this.length++;
  }

  reset() {
    this.length = 0;
  }

  clearCache() {
    this.reset();
    this.data = [];
  }

  getArray() {
    return this.data;
  }
}

export const updateProjectionMatrix = (mat: Mat4, aspectRatio: number, zNear = 1, zFar = 500) => {
  const fov = Math.PI / 4;
  return mat4.perspective(fov, aspectRatio, zNear, zFar, mat);
};

export const updateWorldProjectionMatrix = (worldProjMat: Mat4, projMat: Mat4) => {
  mat4.identity(worldProjMat);

  const camPos = cloneBuf(camera.getPos());
  const rotation = camera.getRotation();

  vec3.negate(camPos, camPos);

  mat4.rotateZ(worldProjMat, rotation[2], worldProjMat);
  mat4.rotateY(worldProjMat, rotation[1], worldProjMat);
  mat4.rotateX(worldProjMat, rotation[0], worldProjMat);
  mat4.translate(worldProjMat, camPos, worldProjMat);
  mat4.multiply(projMat, worldProjMat, worldProjMat);
};

export const updateOrthoProjectionMatrix = (mat: Mat4, screenSize: [number, number]) => {
  return mat4.ortho(0, screenSize[0], 0, screenSize[1], 0, 100, mat) as Float32Array;
};

export const buildDepthTexture = (device: GPUDevice, width: number, height: number) => {
  return device.createTexture({
    size: [width, height],
    format: 'depth24plus',
    usage: GPUTextureUsage.RENDER_ATTACHMENT,
    sampleCount: 4
  });
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

export const removeObjectId = (scene: SimSceneObjInfo[], id: string) => {
  for (let i = 0; i < scene.length; i++) {
    if (scene[i].getId() === id) {
      scene.splice(i, 1);
      break;
    }
  }
};

export class SimSceneObjInfo {
  private obj: SimulationElement3d;
  private id: string | null;
  private lifetime: number | null; // ms
  private currentLife: number;

  constructor(obj: SimulationElement3d, id?: string) {
    this.obj = obj;
    this.id = id || null;
    this.lifetime = null;
    this.currentLife = 0;
  }

  /**
   * @param lifetime - ms
   */
  setLifetime(lifetime: number) {
    this.lifetime = lifetime;
  }

  getLifetime() {
    return this.lifetime;
  }

  lifetimeComplete() {
    if (this.lifetime === null) return false;

    return this.currentLife >= this.lifetime;
  }

  /**
   * @param amount - ms
   */
  traverseLife(amount: number) {
    this.currentLife += amount;
  }

  getObj() {
    return this.obj;
  }

  getId() {
    return this.id;
  }
}

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
export function lossyTriangulate<T>(vertices: T[]) {
  const res: (readonly [T, T, T])[] = [];

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

export function lossyTriangulateStrip<T>(vertices: T[]) {
  const res: T[] = [];

  let upper = vertices.length - 1;
  let lower = 0;
  let onLower = true;

  while (upper > lower) {
    if (onLower) {
      res.push(vertices[lower]);
      lower++;
    } else {
      res.push(vertices[upper]);
      upper--;
    }

    onLower = !onLower;
  }

  res.push(vertices[upper]);

  return res;
}

export function vector3ToPixelRatio(vec: Vector3) {
  vec[0] *= devicePixelRatio;
  vec[1] *= devicePixelRatio;
  vec[2] *= devicePixelRatio;
}

export function vector2ToPixelRatio(vec: Vector2) {
  vec[0] *= devicePixelRatio;
  vec[1] *= devicePixelRatio;
}

export function triangulateWireFrameOrder(len: number) {
  const order = Array(len)
    .fill(0)
    .map((_, index) => index);

  let front = 0;
  let back = len - 1;

  while (front < back) {
    order.push(front, back);

    front++;
    back--;
  }

  return order;
}

export function getTotalVerticesSize(scene: SimSceneObjInfo[]) {
  let total = 0;

  for (let i = 0; i < scene.length; i++) {
    const obj = scene[i].getObj();
    total += obj.getVertexCount() * obj.getShader().getBufferLength();
  }

  return total;
}

export function internalTransitionValues(
  onFrame: (deltaT: number, t: number, total: number) => void,
  adjustment: () => void,
  transitionLength: number,
  func?: (n: number) => number
): Promise<void> {
  const newAdjustment = () => {
    if (settings.transformAdjustments) adjustment();
  };
  return transitionValues(onFrame, newAdjustment, transitionLength, func);
}

export function posTo2dScreen(pos: Vector3) {
  const newPos = cloneBuf(pos);
  newPos[1] = camera.getScreenSize()[1] + newPos[1];
  return newPos;
}

export function createPipeline(device: GPUDevice, info: string, shader: Shader) {
  const shaderModule = shader.getModule();
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  const infoObj: SimulationElementInfo = JSON.parse(info);

  return device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: shader.getBindGroupLayouts()
    }),
    vertex: {
      module: shaderModule,
      entryPoint: shader.getVertexMain(),
      buffers: [shader.getVertexBuffers()]
    },
    fragment: {
      module: shaderModule,
      entryPoint: 'fragment_main',
      targets: [
        {
          format: presentationFormat,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha'
            },
            alpha: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha'
            }
          }
        }
      ]
    },
    primitive: {
      topology: infoObj.topology
    },
    multisample: {
      count: 4
    },
    depthStencil: {
      depthWriteEnabled: !infoObj.transparent,
      depthCompare: 'less',
      format: 'depth24plus'
    }
  });
}
