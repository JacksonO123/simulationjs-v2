import { mat4, vec3 } from 'wgpu-matrix';
import { BUF_LEN, colorOffset, drawingInstancesOffset, uvOffset, vertexSize } from './constants.js';
import { Mat4, Vector2, Vector3 } from './types.js';
import { Color, color, vector2, vector3 } from './utils.js';
import { SimulationElement } from './graphics.js';
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

export const applyElementToScene = (scene: SimulationElement[], el: SimulationElement) => {
  if (el instanceof SimulationElement) {
    scene.unshift(el);
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

  generate(x: number, y: number, z: number, color: Color, uv = vector2()) {
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

export function matrixFromRotation(rotation: Vector3): Mat4 {
  let rotMatrix = mat4.identity();
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
  bindGroupLayout: GPUBindGroupLayout,
  presentationFormat: GPUTextureFormat,
  entryPoint: string,
  topology: GPUPrimitiveTopology
) {
  return device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout]
    }),
    vertex: {
      module,
      entryPoint,
      buffers: [
        {
          arrayStride: vertexSize,
          attributes: [
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
          ]
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

export function getTotalVertices(scene: SimulationElement[]) {
  let total = 0;

  for (let i = 0; i < scene.length; i++) {
    if ((scene[i] as SceneCollection).isCollection) continue;
    total += scene[i].getVertexCount();
  }

  return total;
}
