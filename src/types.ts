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

export type LineGeometryParams<T extends Vector2 | Vector3> = {
  pos: T;
  to: T;
  thickness: number;
};

export type Line2dGeometryParams = LineGeometryParams<Vector2>;

export type Line3dGeometryParams = LineGeometryParams<Vector3>;

export type PolygonGeometryParams = {
  points: Vertex[];
};

export type PipelineGroup = {
  triangleList2d: GPURenderPipeline;
  triangleStrip2d: GPURenderPipeline;
  lineStrip2d: GPURenderPipeline;
  triangleList3d: GPURenderPipeline;
  triangleStrip3d: GPURenderPipeline;
  lineStrip3d: GPURenderPipeline;
};

export type RenderInfo = {
  uniformBuffer: GPUBuffer;
  instanceBuffer: GPUBuffer;
  bindGroupLayout: GPUBindGroupLayout;
  vertexBuffer: GPUBuffer | null;
};
