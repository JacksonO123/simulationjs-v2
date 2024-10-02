import { MemoBuffer } from './buffers.js';
import { CubicBezierCurve2d, SimulationElement3d, SplinePoint2d } from './graphics.js';
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

export type EmptyParams = object;

export interface CubeGeometryParams {
  width: number;
  height: number;
  depth: number;
}

export interface SquareGeometryParams {
  width: number;
  height: number;
}

export interface CircleGeometryParams {
  radius: number;
  detail: number;
}

export interface Spline2dGeometryParams {
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
}

export interface LineGeometryParams {
  pos: Vector3;
  to: Vector3;
  thickness: number;
}

export interface TraceLinesParams {
  maxLength: number | null;
}

export interface PipelineGroup {
  triangleList: GPURenderPipeline;
  triangleStrip: GPURenderPipeline;
  lineStrip: GPURenderPipeline;
  triangleListTransparent: GPURenderPipeline;
  triangleStripTransparent: GPURenderPipeline;
  lineStripTransparent: GPURenderPipeline;
}

export interface VertexParamGeneratorInfo {
  bufferSize: number;
  createBuffer: (x: number, y: number, z: number, color: Color) => number[];
}

export interface ShaderInfo {
  pipeline: GPURenderPipeline;
  paramGenerator: VertexParamGeneratorInfo;
  bufferInfo: {
    buffers: GPUBuffer[];
    layout: GPUBindGroupLayout;
  } | null;
}

export interface VertexParamInfo {
  format: GPUVertexFormat;
  size: number;
}

export interface BindGroupEntry {
  visibility: GPUBindGroupLayoutEntry['visibility'];
  buffer: GPUBindGroupLayoutEntry['buffer'];
}

export type ArrayConstructors =
  | Float32ArrayConstructor
  | Float64ArrayConstructor
  | Int8ArrayConstructor
  | Int16ArrayConstructor
  | Int32ArrayConstructor;

export interface BindGroupValue {
  value: number[];
  usage: GPUBufferDescriptor['usage'];
  array: ArrayConstructors;
}

export interface BindGroupInfo {
  bindings: BindGroupEntry[];
  values: () => BindGroupValue[];
}

export interface SimulationElementInfo {
  topology: GPUPrimitiveTopology;
  transparent: boolean;
  cullMode: GPUCullMode;
}

export interface BufferInfo {
  usage: GPUBufferDescriptor['usage'];
  defaultSize?: number;
  owned?: boolean;
}

export type VertexBufferWriter = (
  element: SimulationElement3d,
  buffer: Float32Array,
  vertex: Vector3,
  vertexIndex: number,
  offset: number
) => void;

export type BufferWriter = (element: SimulationElement3d, buffers: MemoBuffer[], device: GPUDevice) => void;

export type BindGroupGenerator = (element: SimulationElement3d, buffers: MemoBuffer[]) => GPUBindGroup[];
