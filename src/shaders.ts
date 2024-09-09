import { globalInfo } from './internalUtils.js';

export class Shader {
  private bindGroupLayoutDescriptor: GPUBindGroupLayoutDescriptor;
  private bindGroupLayout: GPUBindGroupLayout | null;
  private code: string;

  constructor(code: string, descriptor: GPUBindGroupLayoutDescriptor) {
    this.code = code;
    this.bindGroupLayoutDescriptor = descriptor;
    this.bindGroupLayout = null;
  }

  getCode() {
    return this.code;
  }

  getBindGroupLayout() {
    const device = globalInfo.errorGetDevice();

    if (!this.bindGroupLayout) {
      this.bindGroupLayout = device.createBindGroupLayout(this.bindGroupLayoutDescriptor);
    }

    return this.bindGroupLayout;
  }

  getBindGroupLayoutDescriptor() {
    return this.bindGroupLayoutDescriptor;
  }
}

export const defaultShader = new Shader(
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
);
