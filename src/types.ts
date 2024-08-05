import { CubicBezierCurve2d, SimulationElement2d, SimulationElement3d, SplinePoint2d } from './graphics.js';
import { Color, Vertex } from './utils.js';

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

export type CubeGeometryParams = {
  width: number;
  height: number;
  depth: number;
};

export type SquareGeometryParams = {
  width: number;
  height: number;
  colorMap: VertexColorMap;
  centerOffset: Vector2;
};

export type CircleGeometryParams = {
  radius: number;
  detail: number;
};

export type Spline2dGeometryParams = {
  points: SplinePoint2d[];
  curves: CubicBezierCurve2d[];
  distance: number;
  detail: number;
  interpolateStart: number;
  interpolateLimit: number;
  thickness: number;
  color: Color;
  vertexColors: Color[];
};

export type LineGeometryParams = {
  pos: Vector3;
  to: Vector3;
  fromColor: Color | null;
  toColor: Color | null;
  thickness: number;
};

export type PolygonGeometryParams = {
  points: Vertex[];
};

export type PipelineGroup = {
  triangleList: GPURenderPipeline;
  triangleStrip: GPURenderPipeline;
  lineStrip: GPURenderPipeline;
};

export type RenderInfo = {
  instanceBuffer: GPUBuffer;
  bindGroupLayout: GPUBindGroupLayout;
  vertexBuffer: GPUBuffer | null;
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

export type ArrayTypes = Float32Array | Float64Array | Int8Array | Int16Array | Int32Array;

export type BindGroupValue = {
  value: number[];
  usage: GPUBufferDescriptor['usage'];
  array: ArrayConstructors;
};

export type BindGroupInfo = {
  bindings: BindGroupEntry[];
  values: () => BindGroupValue[];
};
