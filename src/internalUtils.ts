import { mat4, vec3 } from 'wgpu-matrix';
import { BUF_LEN, colorOffset, drawingInstancesOffset, uvOffset, vertexSize } from './constants.js';
import {
  AnySimulationElement,
  VertexParamGeneratorInfo,
  Mat4,
  Vector2,
  Vector3,
  VertexParamInfo
} from './types.js';
import { Color, vector2, vector3 } from './utils.js';
import { Instance, SimulationElement } from './graphics.js';
import { SceneCollection } from './simulation.js';

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

export const addObject = (
  scene: SimSceneObjInfo[],
  el: AnySimulationElement,
  device: GPUDevice | null,
  id?: string
) => {
  if (el instanceof SimulationElement) {
    if (device !== null && (el instanceof Instance || el instanceof SceneCollection)) {
      el.setDevice(device);
    }

    const obj = new SimSceneObjInfo(el, id);
    scene.unshift(obj);
  } else {
    throw logger.error('Cannot add invalid SimulationElement');
  }
};

export const removeObject = (scene: SimSceneObjInfo[], el: AnySimulationElement) => {
  if (!(el instanceof SimulationElement)) return;

  for (let i = 0; i < scene.length; i++) {
    if (scene[i].getObj() === el) {
      scene.splice(i, 1);
      break;
    }
  }
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
  private obj: AnySimulationElement;
  private id: string | null;
  private lifetime: number | null; // ms
  private currentLife: number;

  constructor(obj: AnySimulationElement, id?: string) {
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

class BufferGenerator {
  private instancing = false;

  constructor() {}

  setInstancing(state: boolean) {
    this.instancing = state;
  }

  generate(
    x: number,
    y: number,
    z: number,
    color: Color,
    uv = vector2(),
    vertexParamGenerator?: VertexParamGeneratorInfo
  ) {
    if (vertexParamGenerator) {
      const buf = vertexParamGenerator.createBuffer(x, y, z, color);

      if (buf.length !== vertexParamGenerator.bufferSize) {
        logger.log_error(
          `Vertex size for shader group does not match buffer extension size (${buf.length} to expected ${vertexParamGenerator.bufferSize})`
        );
        return [];
      }

      return buf;
    }

    return [x, y, z, 1, ...color.toBuffer(), ...uv, this.instancing ? 1 : 0];
  }
}

export const bufferGenerator = new BufferGenerator();

export function vector3ToPixelRatio(vec: Vector3) {
  vec[0] *= devicePixelRatio;
  vec[1] *= devicePixelRatio;
  vec[2] *= devicePixelRatio;
}

export function vector2ToPixelRatio(vec: Vector2) {
  vec[0] *= devicePixelRatio;
  vec[1] *= devicePixelRatio;
}

export function matrixFromRotation(rotation: Vector3): Mat4 {
  const rotMatrix = mat4.identity();
  mat4.rotateZ(rotMatrix, rotation[2], rotMatrix);
  mat4.rotateY(rotMatrix, rotation[1], rotMatrix);
  mat4.rotateX(rotMatrix, rotation[0], rotMatrix);

  return rotMatrix;
}

export function rotateMat4(mat: Mat4, rotation: Vector3) {
  mat4.rotateZ(mat, rotation[2], mat);
  mat4.rotateY(mat, rotation[1], mat);
  mat4.rotateX(mat, rotation[0], mat);
}

export function createPipeline(
  device: GPUDevice,
  module: GPUShaderModule,
  bindGroupLayouts: GPUBindGroupLayout[],
  presentationFormat: GPUTextureFormat,
  entryPoint: string,
  topology: GPUPrimitiveTopology,
  vertexParams?: VertexParamInfo[]
) {
  let params: GPUVertexAttribute[] = [
    {
      // position
      shaderLocation: 0,
      offset: 0,
      format: 'float32x4'
    },
    {
      // color
      shaderLocation: 1,
      offset: colorOffset,
      format: 'float32x4'
    },
    {
      // size
      shaderLocation: 2,
      offset: uvOffset,
      format: 'float32x2'
    },
    {
      // drawing instances
      shaderLocation: 3,
      offset: drawingInstancesOffset,
      format: 'float32'
    }
  ];

  let stride = vertexSize;

  if (vertexParams) {
    params = [];
    let offset = 0;

    for (let i = 0; i < vertexParams.length; i++) {
      params.push({
        shaderLocation: i,
        offset,
        format: vertexParams[i].format
      });
      offset += vertexParams[i].size;
    }

    stride = offset;
  }

  return device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: bindGroupLayouts
    }),
    vertex: {
      module,
      entryPoint,
      buffers: [
        {
          arrayStride: stride,
          attributes: params
        }
      ]
    },
    fragment: {
      module,
      entryPoint: 'fragment_main',
      targets: [
        {
          format: presentationFormat
        }
      ]
    },
    primitive: {
      topology
    },
    multisample: {
      count: 4
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: 'less',
      format: 'depth24plus'
    }
  });
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

export function getTotalVertices(scene: SimSceneObjInfo[]) {
  let total = 0;

  for (let i = 0; i < scene.length; i++) {
    const obj = scene[i].getObj();

    total += obj.getVertexCount();
  }

  return total;
}
