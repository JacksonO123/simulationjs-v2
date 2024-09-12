import { CubicBezierCurve2d, SimulationElement2d, SimulationElement3d, SplinePoint2d } from './graphics.js';
import { Color } from './utils.js';

export type FloatArray = Float32Array | Float64Array;

export type Vector4 = FloatArray & [number, number, number, number];

export type Vector3 = FloatArray & [number, number, number];

export type Vector2 = FloatArray & [number, number];

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

export type AnySimulationElement = SimulationElement2d | SimulationElement3d;

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

export interface RenderInfo {
  instanceBuffer: GPUBuffer;
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

export type ArrayTypes = Float32Array | Float64Array | Int8Array | Int16Array | Int32Array;

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
}

export type VertexBufferWriter = (
  element: SimulationElement3d,
  buffer: Float32Array,
  vertex: Vector3,
  vertexIndex: number,
  offset: number
) => void;
