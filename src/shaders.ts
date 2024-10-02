import { MemoBuffer } from './buffers.js';
import { mat4ByteLength } from './constants.js';
import { globalInfo } from './globals.js';
import { Instance, SimulationElement3d } from './graphics.js';
import {
  BindGroupGenerator,
  BufferInfo,
  BufferWriter,
  Vector3,
  VertexBufferWriter,
  VertexParamInfo
} from './types.js';
import { createBindGroup, writeUniformWorldMatrix } from './utils.js';

export const uniformBufferSize = mat4ByteLength * 2 + 4 * 2 + 8; // 4x4 matrix * 2 + vec2<f32> + 8 bc 144 is cool
const defaultInfos = [
  {
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    owned: false
  },
  {
    usage: GPUBufferUsage.STORAGE,
    defaultSize: 10 * 4 * 16 // not sure where this came from, made it up a while ago
  }
];

const defaultBufferWriter = (el: SimulationElement3d) => {
  writeUniformWorldMatrix(el);

  // not writing to buffer[0] because the buffer exists
  // on the element
};

const defaultBindGroupGenerator = (el: SimulationElement3d, buffers: MemoBuffer[]) => {
  const shader = el.getShader();
  const gpuBuffers = [
    el.getUniformBuffer(),
    el.isInstance ? (el as Instance<SimulationElement3d>).getInstanceBuffer() : buffers[0].getBuffer()
  ];

  return [createBindGroup(shader, 0, gpuBuffers)];
};

export class Shader {
  private bindGroupLayoutDescriptors: GPUBindGroupLayoutDescriptor[];
  private bindGroupLayouts: GPUBindGroupLayout[] | null;
  private module: GPUShaderModule | null;
  private code: string;
  private fragmentMain: string;
  private vertexMain: string;
  private vertexBuffers: GPUVertexBufferLayout;
  private bufferLength: number;
  private bufferWriter: BufferWriter;
  private vertexBufferWriter: VertexBufferWriter;
  private bindGroupGenerator: BindGroupGenerator;
  private buffers: MemoBuffer[];
  private bufferInfos: BufferInfo[];

  constructor(
    code: string,
    descriptors: GPUBindGroupLayoutDescriptor[],
    vertexParams: VertexParamInfo[],
    bufferInfos: BufferInfo[],
    bufferWriter: BufferWriter,
    bindGroupGenerator: BindGroupGenerator,
    vertexBufferWriter: VertexBufferWriter,
    vertexMain = 'vertex_main',
    fragmentMain = 'fragment_main'
  ) {
    this.code = code;
    this.bindGroupLayoutDescriptors = descriptors;
    this.bindGroupLayouts = null;
    this.module = null;
    this.bufferWriter = bufferWriter;
    this.vertexBufferWriter = vertexBufferWriter;
    this.bindGroupGenerator = bindGroupGenerator;
    this.vertexMain = vertexMain;
    this.fragmentMain = fragmentMain;
    this.bufferInfos = bufferInfos;
    this.buffers = [];

    for (let i = 0; i < bufferInfos.length; i++) {
      if (bufferInfos[i].owned === false) continue;
      this.buffers.push(new MemoBuffer(bufferInfos[i].usage, bufferInfos[i].defaultSize ?? 0));
    }

    let stride = 0;
    const attributes: GPUVertexAttribute[] = [];

    for (let i = 0; i < vertexParams.length; i++) {
      attributes.push({
        shaderLocation: i,
        offset: stride,
        format: vertexParams[i].format
      });

      stride += vertexParams[i].size;
    }

    this.bufferLength = stride / 4;
    this.vertexBuffers = {
      arrayStride: stride,
      attributes
    };
  }

  getCode() {
    return this.code;
  }

  getBufferLength() {
    return this.bufferLength;
  }

  getVertexBuffers() {
    return this.vertexBuffers;
  }

  getBindGroupLayouts() {
    const device = globalInfo.errorGetDevice();

    if (!this.bindGroupLayouts) {
      this.bindGroupLayouts = this.bindGroupLayoutDescriptors.map((descriptor) =>
        device.createBindGroupLayout(descriptor)
      );
    }

    return this.bindGroupLayouts;
  }

  getBindGroupLayoutDescriptors() {
    return this.bindGroupLayoutDescriptors;
  }

  getBufferInfo() {
    return this.bufferInfos;
  }

  getBufferWriter() {
    return this.bufferWriter;
  }

  getVertexBufferWriter() {
    return this.vertexBufferWriter;
  }

  getBindGroupGenerator() {
    return this.bindGroupGenerator;
  }

  getModule() {
    const device = globalInfo.errorGetDevice();

    if (!this.module) {
      this.module = device.createShaderModule({ code: this.code });
    }

    return this.module;
  }

  getVertexMain() {
    return this.vertexMain;
  }

  getFragmentMain() {
    return this.fragmentMain;
  }

  setVertexInfo(
    element: SimulationElement3d,
    buffer: Float32Array,
    vertex: Vector3,
    vertexIndex: number,
    offset: number
  ) {
    this.vertexBufferWriter(element, buffer, vertex, vertexIndex, offset);
  }

  writeBuffers(el: SimulationElement3d) {
    const device = globalInfo.errorGetDevice();
    this.bufferWriter(el, this.buffers, device);
  }

  getBindGroups(el: SimulationElement3d) {
    return this.bindGroupGenerator(el, this.buffers);
  }
}

const positionSize = 4 * 3;
const colorSize = 4 * 4;
const uvSize = 4 * 2;
const drawingInstancesSize = 4;

export const defaultShader = new Shader(
  `struct Uniforms {
  worldProjectionMatrix: mat4x4<f32>,
  modelProjectionMatrix: mat4x4<f32>,
}
 
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@group(0) @binding(1) var<storage> instanceMatrices: array<mat4x4f>;

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) fragUV: vec2<f32>,
  @location(1) fragColor: vec4<f32>,
  @location(2) fragPosition: vec4<f32>,
}

@vertex
fn vertex_main(
  @builtin(instance_index) instanceIdx: u32,
  @location(0) position: vec3<f32>,
  @location(1) color: vec4<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) drawingInstance: f32
) -> VertexOutput {
  var output: VertexOutput;

  if (drawingInstance == 1) {
    output.Position = uniforms.worldProjectionMatrix * uniforms.modelProjectionMatrix * instanceMatrices[instanceIdx] * vec4(position, 1.0);
  } else {
    output.Position = uniforms.worldProjectionMatrix * uniforms.modelProjectionMatrix * vec4(position, 1.0);
  }

  output.fragUV = uv;
  output.fragPosition = output.Position;
  output.fragColor = color;
  return output;
}

@fragment
fn fragment_main(
  @location(0) fragUV: vec2<f32>,
  @location(1) fragColor: vec4<f32>,
  @location(2) fragPosition: vec4<f32>
) -> @location(0) vec4<f32> {
  return fragColor;
}
`,
  [
    {
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: {
            type: 'uniform'
          }
        } as GPUBindGroupLayoutEntry,
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: 'read-only-storage'
          }
        } as GPUBindGroupLayoutEntry
      ]
    }
  ],
  [
    {
      size: positionSize,
      format: 'float32x3'
    },
    {
      size: colorSize,
      format: 'float32x4'
    },
    {
      size: uvSize,
      format: 'float32x2'
    },
    {
      size: drawingInstancesSize,
      format: 'float32'
    }
  ],
  defaultInfos,
  defaultBufferWriter,
  defaultBindGroupGenerator,
  (el, buffer, vertex, _, offset) => {
    const material = el.getMaterial();
    const vertexColor = material.getColor();
    buffer[offset] = vertex[0];
    buffer[offset + 1] = vertex[1];
    buffer[offset + 2] = vertex[2];
    buffer[offset + 3] = vertexColor.r / 255;
    buffer[offset + 4] = vertexColor.g / 255;
    buffer[offset + 5] = vertexColor.b / 255;
    buffer[offset + 6] = vertexColor.a;
    // TODO possibly change uv for textures
    buffer[offset + 7] = 0;
    buffer[offset + 8] = 0;
    buffer[offset + 9] = el.isInstanced ? 1 : 0;
  }
);

export const vertexColorShader = new Shader(
  `
struct Uniforms {
  worldProjectionMatrix: mat4x4<f32>,
  modelProjectionMatrix: mat4x4<f32>,
}
 
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@group(0) @binding(1) var<storage> instanceMatrices: array<mat4x4f>;

struct VertexOutput {
  @builtin(position) Position: vec4<f32>,
  @location(0) fragUV: vec2<f32>,
  @location(1) fragColor: vec4<f32>,
  @location(2) fragPosition: vec4<f32>,
}

@vertex
fn vertex_main(
  @builtin(instance_index) instanceIdx: u32,
  @location(0) position: vec3<f32>,
  @location(1) color: vec4<f32>,
  @location(2) uv: vec2<f32>,
  @location(3) drawingInstance: f32
) -> VertexOutput {
  var output: VertexOutput;

  if (drawingInstance == 1) {
    output.Position = uniforms.worldProjectionMatrix * uniforms.modelProjectionMatrix * instanceMatrices[instanceIdx] * vec4(position, 1.0);
  } else {
    output.Position = uniforms.worldProjectionMatrix * uniforms.modelProjectionMatrix * vec4(position, 1.0);
  }

  output.fragUV = uv;
  output.fragPosition = output.Position;
  output.fragColor = color;
  return output;
}

@fragment
fn fragment_main(
  @location(0) fragUV: vec2<f32>,
  @location(1) fragColor: vec4<f32>,
  @location(2) fragPosition: vec4<f32>
) -> @location(0) vec4<f32> {
  return fragColor;
}
`,
  [
    {
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: {
            type: 'uniform'
          }
        } as GPUBindGroupLayoutEntry,
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: {
            type: 'read-only-storage'
          }
        } as GPUBindGroupLayoutEntry
      ]
    }
  ],
  [
    {
      size: positionSize,
      format: 'float32x3'
    },
    {
      size: colorSize,
      format: 'float32x4'
    },
    {
      size: uvSize,
      format: 'float32x2'
    },
    {
      size: drawingInstancesSize,
      format: 'float32'
    }
  ],
  defaultInfos,
  defaultBufferWriter,
  defaultBindGroupGenerator,
  (el, buffer, vertex, vertexIndex, offset) => {
    const material = el.getMaterial();
    const colors = material.getVertexColors();
    const vertexColor = colors[vertexIndex] ?? el.getColor();
    // const vertexColor = color(0, 255, 255);
    buffer[offset] = vertex[0];
    buffer[offset + 1] = vertex[1];
    buffer[offset + 2] = vertex[2];
    buffer[offset + 3] = vertexColor.r / 255;
    buffer[offset + 4] = vertexColor.g / 255;
    buffer[offset + 5] = vertexColor.b / 255;
    buffer[offset + 6] = vertexColor.a;
    // TODO possibly change uv for textures
    buffer[offset + 7] = 0;
    buffer[offset + 8] = 0;
    buffer[offset + 9] = el.isInstanced ? 1 : 0;
  }
);
