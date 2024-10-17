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
  TraceLinesParams,
  LerpFunc
} from './types.js';
import {
  Color,
  Vertex,
  cloneBuf,
  cloneVectors,
  matrix4,
  transitionValues,
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
  private subdivision = 0;
  private subdivisionVertexLimit: number | null = null;
  // null if not animating, assumed to be at least the length of vertices
  private fromVertices: Vector3[] | null = null;
  private currentInterpolate = 0; // stops animating after 1
  private updated: boolean;
  protected abstract wireframeOrder: number[];
  protected abstract triangleOrder: number[];
  protected abstract params: T;
  protected vertices: Vector3[];
  protected topology: 'list' | 'strip';

  constructor(geometryType: 'list' | 'strip' = 'list') {
    this.vertices = [];
    this.topology = geometryType;
    this.updated = true;
  }

  getTopology() {
    return this.topology;
  }

  abstract computeVertices(): void;

  compute() {
    this.computeVertices();
    this.updated = false;

    // handle subdivisions

    let initialVertices = [...this.vertices];

    outer: for (let i = 0; i < this.subdivision; i++) {
      const initialLength = initialVertices.length;

      for (let j = 0; j < initialLength - 1; j++) {
        if (this.subdivisionVertexLimit && this.vertices.length >= this.subdivisionVertexLimit) break outer;

        const vert = initialVertices[j];
        const nextVert = initialVertices[j + 1];

        const newVert = cloneBuf(nextVert);

        vec3.add(newVert, vert, newVert);
        vec3.divScalar(newVert, 2, newVert);

        this.vertices.splice(j * 2 + 1, 0, newVert);
      }

      if (initialLength >= 2) {
        const first = initialVertices[0];
        const last = initialVertices[initialVertices.length - 1];
        const newVert = cloneBuf(first);
        vec3.add(newVert, last, newVert);
        vec3.divScalar(newVert, 2, newVert);
        this.vertices.push(newVert);
      }

      initialVertices = [...this.vertices];
    }

    // handle animation

    if (this.fromVertices) {
      const initialFrom = cloneVectors(this.fromVertices);
      const changes: Vector3[] = [];

      for (let i = 0; i < this.vertices.length; i++) {
        const from = initialFrom[i];
        const to = this.vertices[i];
        const diff = cloneBuf(to);
        vec3.sub(diff, from, diff);
        changes.push(diff);
      }

      for (let i = this.vertices.length; i < initialFrom.length; i++) {
        const from = initialFrom[i];
        const to = this.vertices[this.vertices.length - 1];
        const diff = cloneBuf(to);
        vec3.sub(diff, from, diff);
        changes.push(diff);
      }

      for (let i = 0; i < initialFrom.length; i++) {
        const diff = changes[i];
        vec3.mulScalar(diff, this.currentInterpolate, diff);
        vec3.add(initialFrom[i], diff, initialFrom[i]);
      }

      this.vertices = initialFrom;
    }

    if (this.fromVertices || this.subdivision > 0) this.defaultTriangulate();
  }

  private defaultTriangulate() {
    this.wireframeOrder = triangulateWireFrameOrder(this.vertices.length);
    const indexArray = createIndexArray(this.vertices.length);
    this.triangleOrder =
      this.topology === 'list' ? lossyTriangulate(indexArray).flat() : lossyTriangulateStrip(indexArray);
  }

  setSubdivisions(num: number, vertexLimit?: number) {
    if (num >= 0) {
      this.subdivision = num;
      if (vertexLimit) this.subdivisionVertexLimit = vertexLimit;
    }
  }

  clearSubdivisions() {
    this.subdivision = 0;
    this.clearSubdivisionVertexLimit();
  }

  setSubdivisionVertexLimit(limit: number) {
    this.subdivisionVertexLimit = limit;
  }

  clearSubdivisionVertexLimit() {
    this.subdivisionVertexLimit = null;
  }

  animateFrom(fromVertices: Vector3[], t: number, f?: LerpFunc) {
    this.fromVertices = fromVertices;

    // ensure at least the length of vertices
    if (fromVertices.length < this.vertices.length) {
      const initialLen = fromVertices.length;

      for (let i = 0; i < this.vertices.length - initialLen; i++) {
        const last = cloneBuf(fromVertices[fromVertices.length - 1]);
        this.fromVertices.push(last);
      }
    }

    return transitionValues(
      (p) => {
        this.currentInterpolate += p;
        this.updated = true;
      },
      () => {
        this.currentInterpolate = 0;
        this.fromVertices = null;
        this.updated = true;
      },
      t,
      f
    );
  }

  getIndexes(wireframe: boolean) {
    return wireframe ? this.wireframeOrder : this.triangleOrder;
  }

  getVertices() {
    return this.vertices;
  }

  hasUpdated() {
    return this.updated;
  }
}

export class PlaneGeometry extends Geometry<EmptyParams> {
  protected params = {};
  protected wireframeOrder: number[];
  protected triangleOrder: number[];
  private rawVertices: Vertex[];

  constructor(vertices: Vertex[]) {
    super('strip');

    this.wireframeOrder = [];
    this.triangleOrder = [];
    this.rawVertices = vertices;

    this.updateVertices(vertices);
  }

  computeVertices() {}

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

    this.computeVertices();
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

  computeVertices() {
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
    super('strip');

    this.params = {
      width,
      height
    };

    this.computeVertices();
  }

  setWidth(width: number) {
    this.params.width = width;
  }

  setHeight(height: number) {
    this.params.height = height;
  }

  computeVertices(): void {
    this.vertices = [
      vector3(-this.params.width / 2, this.params.height / 2),
      vector3(this.params.width / 2, this.params.height / 2),
      vector3(this.params.width / 2, -this.params.height / 2),
      vector3(-this.params.width / 2, -this.params.height / 2)
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

  computeVertices() {}
}

export class CircleGeometry extends Geometry<CircleGeometryParams> {
  protected wireframeOrder: number[];
  protected triangleOrder: number[];
  protected params: CircleGeometryParams;

  constructor(radius: number, detail: number) {
    super('strip');

    this.wireframeOrder = [];
    this.triangleOrder = [];
    this.params = { radius, detail };

    this.computeVertices();
  }

  setDetail(detail: number) {
    this.params.detail = detail;
  }

  getDetail() {
    return this.params.detail;
  }

  setRadius(radius: number) {
    this.params.radius = radius;
  }

  getRadius() {
    return this.params.radius;
  }

  computeVertices() {
    const vertices: Vector3[] = [];
    const rotationInc = (Math.PI * 2) / this.params.detail;

    for (let i = 0; i < this.params.detail; i++) {
      const mat = matrix4();
      mat4.rotateZ(mat, -rotationInc * i + Math.PI / 2, mat);

      const vec = vector3(this.params.radius);

      vec3.transformMat4(vec, mat, vec);

      vertices.push(vector3(vec[0], vec[1], vec[2]));
    }

    this.vertices = vertices;

    this.triangleOrder = lossyTriangulateStrip(createIndexArray(this.vertices.length)).flat();
    this.wireframeOrder = triangulateWireFrameOrder(this.vertices.length);
  }
}

export class Spline2dGeometry extends Geometry<Spline2dGeometryParams> {
  protected wireframeOrder: number[];
  protected triangleOrder: number[];
  protected params: Spline2dGeometryParams;

  constructor(points: SplinePoint2d[], thickness: number, detail: number) {
    super('strip');

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
    this.computeVertices();
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

  computeVertices() {
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
    super('strip');

    this.params = {
      pos,
      to,
      thickness
    };
  }

  computeVertices() {
    const normal = vector2(-this.params.to[1], this.params.to[0]);
    vec2.normalize(normal, normal);
    vec2.scale(normal, this.params.thickness, normal);

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
    super('strip');

    this.params = {
      pos,
      to,
      thickness
    };
  }

  computeVertices() {
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
    super('strip');

    this.wireframeOrder = [];
    this.triangleOrder = [];
    this.vertices = vertices;

    this.computeVertices();
  }

  computeVertices() {
    this.triangleOrder = lossyTriangulateStrip(createIndexArray(this.vertices.length));
    this.wireframeOrder = triangulateWireFrameOrder(this.vertices.length);
  }
}

export class TraceLines2dGeometry extends Geometry<TraceLinesParams> {
  protected wireframeOrder: number[] = [];
  protected triangleOrder = [];
  protected params: TraceLinesParams;

  constructor(maxLen?: number) {
    super('strip');

    this.params = {
      maxLength: maxLen ?? null
    };
  }

  computeVertices() {}

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

  clear() {
    this.vertices = [];
    this.wireframeOrder = [];
  }
}
