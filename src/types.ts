import { CubicBezierCurve2d, SplinePoint2d } from './graphics.js';
import { Color, Vertex } from './utils.js';

export type Vector4 = Float32Array & [number, number, number, number];

export type Vector3 = Float32Array & [number, number, number];

export type Vector2 = Float32Array & [number, number];

// prettier-ignore
export type Mat4 = Float32Array & [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
]

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
  colorMap: VertexColorMap;
};

export type CircleGeometryParams = {
  radius: number;
  detail: number;
};

export type SplineGeometryParams = {
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
