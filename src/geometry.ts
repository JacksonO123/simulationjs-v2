import { mat4, vec2, vec3 } from 'wgpu-matrix';
import {
  CircleGeometryParams,
  CubeGeometryParams,
  EmptyParams,
  Spline2dGeometryParams,
  SquareGeometryParams,
  Vector2,
  Vector3,
  LineGeometryParams,
  TraceLinesParams
} from './types.js';
import {
  Color,
  Vertex,
  cloneBuf,
  matrix4,
  vector2,
  vector2FromVector3,
  vector3,
  vector3FromVector2
} from './utils.js';
import { CubicBezierCurve2d, SplinePoint2d } from './graphics.js';
import {
  createIndexArray,
  lossyTriangulate,
  lossyTriangulateStrip,
  triangulateWireFrameOrder
} from './internalUtils.js';

export abstract class Geometry<T extends EmptyParams> {
  protected abstract wireframeOrder: number[];
  protected abstract triangleOrder: number[];
  protected abstract params: T;
  protected vertices: Vector3[];
  protected topology: 'list' | 'strip';

  constructor(vertices: Vector3[] = [], geometryType: 'list' | 'strip' = 'list') {
    this.vertices = vertices;
    this.topology = geometryType;
  }

  getTopology() {
    return this.topology;
  }

  abstract recompute(): void;

  getIndexes(wireframe: boolean) {
    return wireframe ? this.wireframeOrder : this.triangleOrder;
  }

  getVertices() {
    return this.vertices;
  }
}

export class PlaneGeometry extends Geometry<EmptyParams> {
  protected params = {};
  protected wireframeOrder: number[];
  protected triangleOrder: number[];
  private rawVertices: Vertex[];

  constructor(vertices: Vertex[]) {
    super([], 'strip');

    this.wireframeOrder = [];
    this.triangleOrder = [];
    this.rawVertices = vertices;

    this.updateVertices(vertices);
  }

  recompute() {}

  updateVertices(vertices: Vertex[]) {
    this.rawVertices = vertices;
    this.vertices = vertices.map((vertex) => vertex.getPos());

    this.wireframeOrder = triangulateWireFrameOrder(this.vertices.length);
    this.triangleOrder = lossyTriangulateStrip(createIndexArray(this.rawVertices.length));
  }
}

export class CubeGeometry extends Geometry<CubeGeometryParams> {
  protected params: CubeGeometryParams;
  protected wireframeOrder = [0, 1, 2, 3, 0, 2, 6, 5, 1, 6, 7, 4, 5, 7, 3, 4, 0, 5, 6, 3];
  // prettier-ignore
  protected triangleOrder = [
    0, 1, 2, 2, 3 ,0,
    6, 5, 4, 7, 6, 4,
    4, 1, 0, 1, 4, 5,
    2, 1, 5, 5, 6, 2,
    0, 3, 4, 7, 4, 3,
    3, 6, 7, 6, 3, 2
  ];

  constructor(width: number, height: number, depth: number) {
    super();

    this.params = {
      width,
      height,
      depth
    };

    this.recompute();
  }

  setWidth(width: number) {
    this.params.width = width;
  }

  setHeight(height: number) {
    this.params.height = height;
  }

  setDepth(depth: number) {
    this.params.depth = depth;
  }

  recompute() {
    const { width, height, depth } = this.params;

    this.vertices = [
      // front face
      vector3(-width / 2, -height / 2, depth / 2),
      vector3(width / 2, -height / 2, depth / 2),
      vector3(width / 2, height / 2, depth / 2),
      vector3(-width / 2, height / 2, depth / 2),

      // back face
      vector3(-width / 2, -height / 2, -depth / 2),
      vector3(width / 2, -height / 2, -depth / 2),
      vector3(width / 2, height / 2, -depth / 2),
      vector3(-width / 2, height / 2, -depth / 2)
    ];
  }

  updateSize(width: number, height: number, depth: number) {
    this.params.width = width;
    this.params.height = height;
    this.params.depth = depth;
  }
}

export class SquareGeometry extends Geometry<SquareGeometryParams> {
  protected wireframeOrder = [0, 1, 2, 3, 0, 2];
  protected triangleOrder = [0, 3, 1, 2];
  protected params: SquareGeometryParams;

  constructor(width: number, height: number) {
    super([], 'strip');

    this.params = {
      width,
      height
    };

    this.recompute();
  }

  setWidth(width: number) {
    this.params.width = width;
  }

  setHeight(height: number) {
    this.params.height = height;
  }

  recompute(): void {
    this.vertices = [
      vector3(-this.params.width, this.params.height),
      vector3(this.params.width, this.params.height),
      vector3(this.params.width, -this.params.height),
      vector3(-this.params.width, -this.params.height)
    ];
  }
}

export class BlankGeometry extends Geometry<EmptyParams> {
  protected wireframeOrder = [];
  protected triangleOrder = [];
  protected params = {};

  constructor() {
    super();
  }

  recompute() {}
}

export class CircleGeometry extends Geometry<CircleGeometryParams> {
  protected wireframeOrder: number[];
  protected triangleOrder: number[];
  protected params: CircleGeometryParams;

  constructor(radius: number, detail: number) {
    super([], 'strip');

    this.wireframeOrder = [];
    this.triangleOrder = [];
    this.params = { radius, detail };

    this.recompute();
  }

  setRadius(radius: number) {
    this.params.radius = radius;
  }

  recompute() {
    const vertices: Vector3[] = [];
    const rotationInc = (Math.PI * 2) / this.params.detail;

    for (let i = 0; i < this.params.detail; i++) {
      const mat = matrix4();
      mat4.rotateZ(mat, rotationInc * i, mat);

      const vec = vector3(this.params.radius);

      vec3.transformMat4(vec, mat, vec);

      vertices.push(vector3(vec[0], vec[1], vec[2]));
    }

    this.vertices = vertices;

    this.triangleOrder = lossyTriangulate(createIndexArray(this.vertices.length)).flat();
    this.wireframeOrder = triangulateWireFrameOrder(this.vertices.length);
  }
}

export class Spline2dGeometry extends Geometry<Spline2dGeometryParams> {
  protected wireframeOrder: number[];
  protected triangleOrder: number[];
  protected params: Spline2dGeometryParams;

  constructor(points: SplinePoint2d[], thickness: number, detail: number) {
    super([], 'strip');

    this.wireframeOrder = [];
    this.triangleOrder = [];

    this.params = {
      points: points,
      curves: [],
      distance: 0,
      detail: detail,
      interpolateStart: 0,
      interpolateLimit: 1,
      thickness: thickness,
      vertexInterpolations: [],
      curveVertexIndices: []
    };

    this.computeCurves();
    this.recompute();
  }

  updateInterpolationStart(start: number) {
    this.params.interpolateStart = Math.min(1, Math.max(0, start));
  }

  updateInterpolationLimit(limit: number) {
    this.params.interpolateLimit = Math.min(1, Math.max(0, limit));
  }

  getInterpolationStart() {
    return this.params.interpolateStart;
  }

  getInterpolationLimit() {
    return this.params.interpolateLimit;
  }

  getDistance() {
    return this.params.distance;
  }

  updatePoint(pointIndex: number, newPoint: SplinePoint2d) {
    if (pointIndex < 0 && pointIndex >= this.params.points.length) return;

    const start = newPoint.getStart();
    const end = newPoint.getEnd();
    const [startControl, endControl] = newPoint.getControls();
    const rawControls = newPoint.getRawControls();

    vec3.add(end.getPos(), rawControls[1], endControl);

    if (start && startControl) {
      vec3.add(start.getPos(), rawControls[0], startControl);
    }

    this.params.points[pointIndex] = newPoint;
    this.computeCurves();
  }

  updateThickness(thickness: number) {
    this.params.thickness = thickness;
  }

  getCurves() {
    return this.params.curves;
  }

  getVertexInterpolations() {
    return this.params.vertexInterpolations;
  }

  getCurveVertexIndices() {
    return this.params.curveVertexIndices;
  }

  private computeCurves() {
    this.params.curves = [];
    this.params.distance = 0;

    for (let i = 0; i < this.params.points.length; i++) {
      let prevControl = null;
      let prevColor: Color | null = null;

      if (i > 0) {
        prevControl = cloneBuf(this.params.points[i - 1].getRawControls()[1]);
        vec2.negate(prevControl, prevControl);

        const prevColors = this.params.points[i - 1].getColors();
        if (prevColors.at(-1)) {
          prevColor = prevColors.at(-1) ?? null;
        }
      }

      const bezierPoints = this.params.points[i].getVectorArray(
        i > 0 ? vector2FromVector3(this.params.points[i - 1].getEnd().getPos()) : null,
        prevControl
      );

      const curve = new CubicBezierCurve2d(
        bezierPoints as [Vector2, Vector2, Vector2, Vector2],
        this.params.points[i].getDetail(),
        this.params.points[i].getColors(prevColor)
      );

      this.params.distance += curve.getLength();
      this.params.curves.push(curve);
    }
  }

  recompute() {
    this.vertices = [];
    this.params.vertexInterpolations = [];
    this.params.curveVertexIndices = [];

    const verticesTop: Vector3[] = [];
    const verticesBottom: Vector3[] = [];

    let currentDistance = 0;
    let interpolationStarted = false;

    outer: for (let i = 0; i < this.params.curves.length; i++) {
      const detail = this.params.curves[i].getDetail() ?? this.params.detail;
      const step = 1 / detail;

      const distanceRatio = currentDistance / this.params.distance;
      if (distanceRatio > this.params.interpolateLimit) break;

      const curveLength = this.params.curves[i].getLength();
      currentDistance += curveLength;
      const sectionRatio = curveLength / this.params.distance;

      let curveVertexIndexSet = i === 0;

      for (let j = 0; j < detail + 1; j++) {
        let currentInterpolation = step * j;
        let atLimit = false;

        if (step * j * sectionRatio + distanceRatio > this.params.interpolateLimit) {
          atLimit = true;
          currentInterpolation = (this.params.interpolateLimit - distanceRatio) / sectionRatio;
        }

        if (currentInterpolation * sectionRatio + distanceRatio < this.params.interpolateStart) {
          continue;
        }

        if (!interpolationStarted) {
          interpolationStarted = true;
          currentInterpolation = (this.params.interpolateStart - distanceRatio) / sectionRatio;
          j--;
        }

        if (!curveVertexIndexSet) {
          this.params.curveVertexIndices.push(verticesTop.length);
          curveVertexIndexSet = true;
        }

        const [point2d, slope] = this.params.curves[i].interpolateSlope(currentInterpolation);
        const point = vector3FromVector2(point2d);

        const normal = vector2(-slope[1], slope[0]);
        vec2.normalize(normal, normal);
        vec2.scale(normal, this.params.thickness / 2, normal);

        this.params.vertexInterpolations.push(currentInterpolation);

        const vertTop = vector3(point[0] + normal[0], point[1] + normal[1]);
        verticesTop.push(vertTop);

        const vertBottom = vector3(point[0] - normal[0], point[1] - normal[1]);
        verticesBottom.unshift(vertBottom);

        if (atLimit) {
          break outer;
        }
      }
    }

    this.vertices = verticesTop.concat(verticesBottom);
    this.triangleOrder = lossyTriangulateStrip(createIndexArray(this.vertices.length));
    this.wireframeOrder = triangulateWireFrameOrder(this.vertices.length);
  }
}

export class Line2dGeometry extends Geometry<LineGeometryParams> {
  protected wireframeOrder = [0, 1, 2, 3, 0, 2];
  protected triangleOrder = [0, 3, 1, 2];
  protected params: LineGeometryParams;

  constructor(pos: Vector3, to: Vector3, thickness: number) {
    super([], 'strip');

    this.params = {
      pos,
      to,
      thickness
    };
  }

  recompute() {
    const normal = vector2(-this.params.to[1], this.params.to[0]);
    vec2.normalize(normal, normal);
    vec2.scale(normal, this.params.thickness / 2, normal);

    this.vertices = [
      vector3(-normal[0], -normal[1]),
      vector3(normal[0], normal[1]),
      vector3(this.params.to[0] + normal[0], this.params.to[1] + normal[1]),
      vector3(this.params.to[0] - normal[0], this.params.to[1] - normal[1])
    ];
  }
}

export class Line3dGeometry extends Geometry<LineGeometryParams> {
  protected wireframeOrder = [0, 1, 2, 3, 0, 2];
  protected triangleOrder = [0, 3, 1, 2];
  protected params: LineGeometryParams;

  constructor(pos: Vector3, to: Vector3, thickness: number) {
    super([], 'strip');

    this.params = {
      pos,
      to,
      thickness
    };
  }

  recompute() {
    const normal = vector2(-this.params.to[1], this.params.to[0]);
    vec2.normalize(normal, normal);
    vec2.scale(normal, this.params.thickness / 2, normal);

    this.vertices = [
      vector3(-normal[0], -normal[1]),
      vector3(normal[0], normal[1]),
      vector3(this.params.to[0] + normal[0], this.params.to[1] + normal[1], this.params.to[2]),
      vector3(this.params.to[0] - normal[0], this.params.to[1] - normal[1], this.params.to[2])
    ];
  }
}

export class PolygonGeometry extends Geometry<EmptyParams> {
  protected wireframeOrder: number[];
  protected triangleOrder: number[];
  protected params = {};

  constructor(vertices: Vector3[]) {
    super([], 'strip');

    this.wireframeOrder = [];
    this.triangleOrder = [];
    this.vertices = vertices;

    this.recompute();
  }

  recompute() {
    this.triangleOrder = lossyTriangulateStrip(createIndexArray(this.vertices.length));
    this.wireframeOrder = triangulateWireFrameOrder(this.vertices.length);
  }
}

export class TraceLines2dGeometry extends Geometry<TraceLinesParams> {
  protected wireframeOrder: number[] = [];
  protected triangleOrder = [];
  protected params: TraceLinesParams;

  constructor(maxLen?: number) {
    super([], 'strip');

    this.params = {
      maxLength: maxLen ?? null
    };
  }

  recompute() {}

  getVertexCount() {
    return this.vertices.length;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getOrder(_: boolean): readonly [Vector3[], number[]] {
    return [this.vertices, this.wireframeOrder];
  }

  addVertex(vert: Vector3) {
    this.vertices.push(vert);
    if (this.params.maxLength && this.vertices.length > this.params.maxLength) {
      this.vertices.shift();
    } else {
      this.wireframeOrder.push(this.wireframeOrder.length);
    }
  }
}
