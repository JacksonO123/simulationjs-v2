import { mat4, vec3 } from 'wgpu-matrix';
import { BUF_LEN, colorOffset, drawingInstancesOffset, uvOffset, vertexSize } from './constants.js';
import { VertexParamGeneratorInfo, Mat4, Vector2, Vector3, VertexParamInfo } from './types.js';
import { Color, cloneBuf, matrix4, vector2, vector3 } from './utils.js';
import { SimulationElement } from './graphics.js';
import { Camera } from './simulation.js';

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
    return this.vertices.length / BUF_LEN;
  }
}

export const updateProjectionMatrix = (mat: Mat4, aspectRatio: number, zNear = 1, zFar = 500) => {
  const fov = (2 * Math.PI) / 5;
  return mat4.perspective(fov, aspectRatio, zNear, zFar, mat);
};

export const updateWorldProjectionMatrix = (worldProjMat: Mat4, projMat: Mat4, camera: Camera) => {
  mat4.identity(worldProjMat);

  const camPos = cloneBuf(camera.getPos());
  const rotation = camera.getRotation();

  vec3.scale(camPos, -1, camPos);

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
  private obj: SimulationElement;
  private id: string | null;
  private lifetime: number | null; // ms
  private currentLife: number;

  constructor(obj: SimulationElement, id?: string) {
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

    return [x, y, z, ...color.toBuffer(), ...uv, this.instancing ? 1 : 0];
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
      entryPoint: 'vertex_main',
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

// TODO remove
export function rotationFromMat4(mat: Mat4, rotation: Vector3) {
  vec3.zero(rotation);
  const infoMat = matrix4();

  mat4.clone(mat, infoMat);
  mat4.setTranslation(infoMat, rotation, infoMat);
  rotation[0] = 1;
  vec3.transformMat4(rotation, infoMat, rotation);
}

export function vectorCompAngle(a: number, b: number) {
  return a !== 0 && b !== 0 ? Math.atan2(a, b) : 0;
}

export function angleBetween(pos1: Vector3, pos2: Vector3) {
  const diff = vec3.sub(pos1, pos2);
  const angleZ = vectorCompAngle(diff[0], diff[1]);
  const angleY = vectorCompAngle(diff[0], diff[2]);
  const angleX = vectorCompAngle(diff[2], diff[1]);
  return vector3(angleX, angleY, angleZ);
}
