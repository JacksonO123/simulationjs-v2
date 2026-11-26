import { WebGPUMemoBuffer } from '../buffers/webgpu.js';
import { mat4ByteLength, modelProjMatOffset, objectAlphaOffset } from '../constants.js';
import { logger } from '../globals.js';
import { Instance, SimulationElement3d } from '../graphics.js';
import {
    WebGPUBufferDeclaration,
    Vector3,
    VertexBufferWriter,
    VertexParamInfo,
    Mat4
} from '../types.js';
import { orthogonalMatrix, Simulation, worldProjectionMatrix } from '../simulation.js';
import { worldProjMatOffset } from '../constants.js';
import { defaultVertexColorBufferWriter, SimJSShader } from './shader.js';
import { mat4 } from 'wgpu-matrix';

export const WEBGPU_DEFAULT_SHADER_UNIFORM_BUFFER_SIZE = mat4ByteLength * 2 + 4 * 2 + 8; // 4x4 matrix * 2 + vec2<f32> + 8 bc 144 is cool

const SHADER_NOT_INIT_ERROR = 'Shader not initialized';

type WebGPUUniformBufferWriter = (
    device: GPUDevice,
    element: SimulationElement3d,
    buffers: WebGPUMemoBuffer[]
) => void;

type WebGPUBindGroupGenerator = (
    sim: Simulation,
    device: GPUDevice,
    element: SimulationElement3d,
    buffers: WebGPUMemoBuffer[]
) => GPUBindGroup[];

const defaultInfos = [
    {
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        defaultSize: 10 * 4 * 16 // not sure where this came from, made it up a while ago
    }
];

const lastWrittenUniforms = new WeakMap<
    SimulationElement3d,
    { projection: Mat4; model: Mat4; objectAlpha: number }
>();
const objectAlphaScratch = new Float32Array(1);

const defaultWebGPUUniformBufferWriter: WebGPUUniformBufferWriter = (device, el, buffers) => {
    const projBuf = el.is3d ? worldProjectionMatrix : orthogonalMatrix;
    let buffer = el.getUniformBuffer() as WebGPUMemoBuffer | null;
    if (!buffer) {
        buffer = new WebGPUMemoBuffer(
            device,
            GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
            WEBGPU_DEFAULT_SHADER_UNIFORM_BUFFER_SIZE
        );
        el.setUniformBuffer(buffer);
    }

    const modelMatrix = el.getModelMatrix();

    let last = lastWrittenUniforms.get(el);
    if (!last) {
        last = {
            projection: new Float32Array(mat4ByteLength / 4) as Mat4,
            model: new Float32Array(mat4ByteLength / 4) as Mat4,
            objectAlpha: Number.NaN
        };
        lastWrittenUniforms.set(el, last);
    }

    if (!mat4.equals(last.projection, projBuf)) {
        device.queue.writeBuffer(
            buffer.getBuffer(),
            worldProjMatOffset,
            projBuf.buffer,
            projBuf.byteOffset,
            projBuf.byteLength
        );
        last.projection.set(projBuf);
    }

    if (!mat4.equals(last.model, modelMatrix)) {
        device.queue.writeBuffer(
            buffer.getBuffer(),
            modelProjMatOffset,
            modelMatrix.buffer,
            modelMatrix.byteOffset,
            modelMatrix.byteLength
        );
        last.model.set(modelMatrix);
    }

    const objectAlpha = el.getObjectAlpha();
    if (objectAlpha !== last.objectAlpha) {
        objectAlphaScratch[0] = objectAlpha;
        device.queue.writeBuffer(
            buffer.getBuffer(),
            objectAlphaOffset,
            objectAlphaScratch.buffer,
            objectAlphaScratch.byteOffset,
            objectAlphaScratch.byteLength
        );
        last.objectAlpha = objectAlpha;
    }

    if (el.isInstance) {
        buffers[0].write((el as Instance<SimulationElement3d>).getInstanceBuffer());
    }
};

const defaultBindGroupGenerator: WebGPUBindGroupGenerator = (
    sim: Simulation,
    device: GPUDevice,
    el: SimulationElement3d,
    buffers: WebGPUMemoBuffer[]
) => {
    const shader = el.getShaderOrError().as('webgpu');
    const gpuBuffers = [
        (el.getUniformBuffer() as WebGPUMemoBuffer).getBuffer(),
        buffers[0].getBuffer()
    ];

    return [createBindGroup(sim, device, shader, 0, gpuBuffers)];
};

export class SimJSWebGPUShader extends SimJSShader {
    protected buffers: WebGPUMemoBuffer[];
    private bindGroupLayoutDescriptors: GPUBindGroupLayoutDescriptor[];
    private bindGroupLayouts: GPUBindGroupLayout[] | null;
    private module: GPUShaderModule | null;
    private code: string;
    private fragmentMain: string;
    private vertexMain: string;
    private vertexBuffers: GPUVertexBufferLayout;
    private uniformBufferWriter: WebGPUUniformBufferWriter;
    private bindGroupGenerator: WebGPUBindGroupGenerator;
    private bufferDeclarations: WebGPUBufferDeclaration[];
    private device: GPUDevice | null;

    constructor(
        code: string,
        descriptors: GPUBindGroupLayoutDescriptor[],
        vertexParams: VertexParamInfo[],
        bufferDeclarations: WebGPUBufferDeclaration[],
        uniformBufferWriter: WebGPUUniformBufferWriter,
        bindGroupGenerator: WebGPUBindGroupGenerator,
        vertexBufferWriter: VertexBufferWriter,
        vertexMain = 'vertex_main',
        fragmentMain = 'fragment_main'
    ) {
        super('webgpu', vertexBufferWriter);

        this.buffers = [];
        this.device = null;
        this.code = code;
        this.bindGroupLayoutDescriptors = descriptors;
        this.bindGroupLayouts = null;
        this.module = null;
        this.uniformBufferWriter = uniformBufferWriter;
        this.bindGroupGenerator = bindGroupGenerator;
        this.vertexMain = vertexMain;
        this.fragmentMain = fragmentMain;
        this.bufferDeclarations = bufferDeclarations;

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

    init(device: GPUDevice) {
        this.device = device;

        for (let i = 0; i < this.bufferDeclarations.length; i++) {
            this.buffers.push(
                new WebGPUMemoBuffer(
                    device,
                    this.bufferDeclarations[i].usage,
                    this.bufferDeclarations[i].defaultSize ?? 0
                )
            );
        }
    }

    getCode() {
        return this.code;
    }

    getVertexBuffers() {
        return this.vertexBuffers;
    }

    getBindGroupLayouts(sim: Simulation) {
        const backend = sim.getBackend().as('webgpu');
        const device = backend.getDeviceOrError();

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
        return this.bufferDeclarations;
    }

    getUniformBufferWriter() {
        return this.uniformBufferWriter;
    }

    getVertexBufferWriter() {
        return this.vertexBufferWriter;
    }

    getBindGroupGenerator() {
        return this.bindGroupGenerator;
    }

    getModule() {
        if (!this.device) throw logger.error(SHADER_NOT_INIT_ERROR);

        if (!this.module) {
            this.module = this.device.createShaderModule({ code: this.code });
        }

        return this.module as GPUShaderModule;
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

    writeUniformBuffers(el: SimulationElement3d) {
        if (!this.device) throw logger.error(SHADER_NOT_INIT_ERROR);
        this.uniformBufferWriter(this.device, el, this.buffers);
    }

    getBindGroups(sim: Simulation, device: GPUDevice, el: SimulationElement3d) {
        return this.bindGroupGenerator(sim, device, el, this.buffers);
    }
}

const positionSize = 4 * 3;
const colorSize = 4 * 4;
const uvSize = 4 * 2;
const drawingInstancesSize = 4;

const defaultWebGPUShaderSource = `struct Uniforms {
  worldProjectionMatrix: mat4x4<f32>,
  modelProjectionMatrix: mat4x4<f32>,
  objectAlpha: f32,
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
  return vec4(fragColor.rgb, fragColor.a * uniforms.objectAlpha);
}
`;

export const defaultWebGPUShader = new SimJSWebGPUShader(
    defaultWebGPUShaderSource,
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
    defaultWebGPUUniformBufferWriter,
    defaultBindGroupGenerator,
    defaultVertexColorBufferWriter
);

export const defaultWebGPUVertexColorShader = new SimJSWebGPUShader(
    defaultWebGPUShaderSource,
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
    defaultWebGPUUniformBufferWriter,
    defaultBindGroupGenerator,
    defaultVertexColorBufferWriter
);

export function createBindGroup(
    sim: Simulation,
    device: GPUDevice,
    shader: SimJSWebGPUShader,
    bindGroupIndex: number,
    buffers: GPUBuffer[]
) {
    const layout = shader.getBindGroupLayouts(sim)[bindGroupIndex];

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
