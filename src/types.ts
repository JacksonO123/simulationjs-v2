import { WebGLBackend } from './backends/webgl.js';
import { WebGPUBackend } from './backends/webgpu.js';
import { MemoBuffer } from './buffers/buffer.js';
import { WebGLMemoBuffer } from './buffers/webgl.js';
import { WebGPUMemoBuffer } from './buffers/webgpu.js';
import { CubicBezierCurve2d, SimulationElement3d, SplinePoint2d } from './graphics.js';
import { SimJSWebGLShader } from './shaders/webgl.js';
import { SimJSWebGPUShader } from './shaders/webgpu.js';
import { Color } from './utils.js';

export type FloatArray = Float32Array | Float64Array;

export type UintArray = Uint8Array | Uint16Array | Uint32Array;

export type IntArray = Int8Array | Int16Array | Int32Array;

export type ArrayTypes = FloatArray | UintArray | IntArray;

export type Vector2 = FloatArray & [number, number];

export type Vector3 = FloatArray & [number, number, number];

export type Vector4 = FloatArray & [number, number, number, number];

export type Vector2m = Vector2 | Vector3 | Vector4;

export type Vector3m = Vector3 | Vector4;

// prettier-ignore
export type Mat4 = FloatArray & [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
]

export type Quat = Float32Array & [number, number, number, number];

export type LerpFunc = (n: number) => number;

export type VertexColorMap = Record<number, Color>;

export type ElementRotation<T extends Vector2 | Vector3> = T extends Vector2 ? number : T;

export type CubeGeometryParams = {
    width: number;
    height: number;
    depth: number;
};

export type SquareGeometryParams = {
    width: number;
    height: number;
};

export type CircleGeometryParams = {
    radius: number;
    detail: number;
};

export type Spline2dGeometryParams = {
    // input
    points: SplinePoint2d[];
    detail: number;
    interpolateStart: number;
    interpolateLimit: number;
    thickness: number;

    // output
    curves: CubicBezierCurve2d[];
    distance: number;
    vertexInterpolations: number[];
    curveVertexIndices: number[];
};

export type LineGeometryParams = {
    pos: Vector3;
    to: Vector3;
    thickness: number;
};

export type TraceLinesParams = {
    maxLength: number | null;
};

export type PipelineGroup = {
    triangleList: GPURenderPipeline;
    triangleStrip: GPURenderPipeline;
    lineStrip: GPURenderPipeline;
    triangleListTransparent: GPURenderPipeline;
    triangleStripTransparent: GPURenderPipeline;
    lineStripTransparent: GPURenderPipeline;
};

export type VertexParamGeneratorInfo = {
    bufferSize: number;
    createBuffer: (x: number, y: number, z: number, color: Color) => number[];
};

export type ShaderInfo = {
    pipeline: GPURenderPipeline;
    paramGenerator: VertexParamGeneratorInfo;
    bufferInfo: {
        buffers: GPUBuffer[];
        layout: GPUBindGroupLayout;
    } | null;
};

export type VertexParamInfo = {
    format: GPUVertexFormat;
    size: number;
};

export type BindGroupEntry = {
    visibility: GPUBindGroupLayoutEntry['visibility'];
    buffer: GPUBindGroupLayoutEntry['buffer'];
};

export type ArrayConstructors =
    | Float32ArrayConstructor
    | Float64ArrayConstructor
    | Int8ArrayConstructor
    | Int16ArrayConstructor
    | Int32ArrayConstructor;

export type BindGroupValue = {
    value: number[];
    usage: GPUBufferDescriptor['usage'];
    array: ArrayConstructors;
};

export type BindGroupInfo = {
    bindings: BindGroupEntry[];
    values: () => BindGroupValue[];
};

export type SimulationElementInfo = {
    topology: GPUPrimitiveTopology;
    transparent: boolean;
    cullMode: GPUCullMode;
};

export type WebGPUBufferDecleration = {
    usage: GPUBufferDescriptor['usage'];
    defaultSize?: number;
};

export type WebGLBufferDecleration = {
    target: GLenum;
    usage: GLenum;
    defaultCapacity?: number;
};

export type VertexBufferWriter = (
    element: SimulationElement3d,
    buffer: Float32Array,
    vertex: Vector3,
    vertexIndex: number,
    offset: number
) => void;

export type BackendType = 'webgpu' | 'webgl';

export type BackendSpecificType<
    T extends BackendType,
    WebGPUOption,
    WebGLOption
> = T extends 'webgpu' ? WebGPUOption : WebGLOption;

export type SpecificBackendType<T extends BackendType> = BackendSpecificType<
    T,
    WebGPUBackend,
    WebGLBackend
>;

export type SpecificShaderType<T extends BackendType> = BackendSpecificType<
    T,
    SimJSWebGPUShader,
    // TODO - maybe remove this later
    SimJSWebGLShader<any>
>;

export type SpecificMemoBufferType<T extends BackendType> = BackendSpecificType<
    T,
    WebGPUMemoBuffer,
    WebGLMemoBuffer
>;

export type GPUBuffers<T extends BackendType | unknown> = {
    gpuVertexCallBuffer: MemoBufferFromBackendType<T>;
    gpuIndexBuffer: MemoBufferFromBackendType<T>;
};

export type AnyGPUBuffer = GPUBuffer | WebGLBuffer;

export type MemoBufferFromBackendType<T extends BackendType | unknown> = T extends BackendType
    ? SpecificMemoBufferType<T>
    : MemoBuffer;

export type BufferFromBackendType<T extends BackendType | unknown> = T extends BackendType
    ? BackendSpecificType<T, GPUBuffer, WebGLBuffer>
    : unknown;
