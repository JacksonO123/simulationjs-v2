import { mat4, vec2, vec3 } from 'wgpu-matrix';
import {
  CircleGeometryParams,
  CubeGeometryParams,
  Line2dGeometryParams,
  Line3dGeometryParams,
  Mat4,
  PolygonGeometryParams,
  Spline2dGeometryParams,
  SquareGeometryParams,
  Vector2,
  Vector3,
  VertexColorMap
} from './types.js';
import {
  Color,
  Vertex,
  cloneBuf,
  matrix4,
  vector2,
  vector2FromVector3,
  vector3,
  vector3FromVector2,
  vertex
} from './utils.js';
import { CubicBezierCurve2d, SplinePoint2d } from './graphics.js';
import { BUF_LEN } from './constants.js';
import {
  bufferGenerator,
  interpolateColors,
  lossyTriangulate,
  triangulateWireFrameOrder
} from './internalUtils.js';

export abstract class Geometry {
  protected abstract wireframeOrder: number[];
  protected abstract triangleOrder: number[];
  protected abstract params: Record<string, any>;
  protected vertices: Vector3[];
  protected matrix: Mat4;
  protected geometryType: 'list' | 'strip';

  constructor(vertices: Vector3[] = [], geometryType: 'list' | 'strip' = 'list') {
    this.vertices = vertices;
    this.matrix = matrix4();
    this.geometryType = geometryType;
  }

  updateMatrix(matrix: Mat4) {
    this.matrix = matrix;
  }

  getType() {
    return this.geometryType;
  }

  abstract recompute(): void;

  getTriangleVertexCount() {
    return this.triangleOrder.length;
  }

  getWireframeVertexCount() {
    return this.wireframeOrder.length;
  }

  protected bufferFromOrder(order: number[], color: Color) {
    return order
      .map((vertexIndex) => {
        const pos = cloneBuf(this.vertices[vertexIndex]);
        vec3.transformMat4(pos, this.matrix, pos);

        return bufferGenerator.generate(pos[0], pos[1], pos[2], color);
      })
      .flat();
  }

  getWireframeBuffer(color: Color) {
    return this.bufferFromOrder(this.wireframeOrder, color);
  }

  getTriangleBuffer(color: Color) {
    return this.bufferFromOrder(this.triangleOrder, color);
  }
}

export class PlaneGeometry extends Geometry {
  protected params = {};
  protected wireframeOrder: number[];
  protected triangleOrder: number[];
  private rawVertices: Vertex[];

  constructor(vertices: Vertex[]) {
    super();

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
    this.triangleOrder = lossyTriangulate(
      Array(this.rawVertices.length)
        .fill(0)
        .map((_, index) => index)
    ).flat();
  }

  getTriangleBuffer(color: Color) {
    return this.triangleOrder
      .map((index) => {
        const vertex = this.rawVertices[index];
        const pos = cloneBuf(vertex.getPos());

        vec3.transformMat4(pos, this.matrix, pos);

        return bufferGenerator.generate(pos[0], pos[1], pos[2], vertex.getColor() || color);
      })
      .flat();
  }
}

export class CubeGeometry extends Geometry {
  protected params: CubeGeometryParams;
  protected wireframeOrder = [0, 1, 2, 3, 0, 2, 6, 5, 1, 6, 7, 4, 5, 7, 3, 4, 0, 5, 6, 3];
  // prettier-ignore
  protected triangleOrder = [
    0, 1, 2, 0, 2, 3,
    4, 5, 6, 4, 6, 7,
    0, 3, 7, 0, 7, 4,
    0, 4, 5, 0, 5, 1,
    1, 2, 6, 1, 5, 6,
    2, 3, 7, 2, 6, 7
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

export class SquareGeometry extends Geometry {
  protected wireframeOrder = [0, 1, 2, 3, 0, 2];
  protected triangleOrder = [0, 1, 3, 2];
  protected params: SquareGeometryParams;

  constructor(width: number, height: number, centerOffset?: Vector2) {
    super([], 'strip');

    this.params = {
      width,
      height,
      colorMap: {},
      centerOffset: centerOffset || vector2(0, 0)
    };

    this.recompute();
  }

  setVertexColorMap(colorMap: VertexColorMap) {
    this.params.colorMap = colorMap;
  }

  setWidth(width: number) {
    this.params.width = width;
  }

  setHeight(height: number) {
    this.params.height = height;
  }

  recompute(): void {
    const centerOffset = this.params.centerOffset;

    this.vertices = [
      vector3(-this.params.width * centerOffset[0], this.params.height * centerOffset[1]),
      vector3(this.params.width * (1 - centerOffset[0]), this.params.height * centerOffset[1]),
      vector3(this.params.width * (1 - centerOffset[0]), -this.params.height * (1 - centerOffset[1])),
      vector3(-this.params.width * centerOffset[0], -this.params.height * (1 - centerOffset[1]))
    ];
  }

  getTriangleBuffer(color: Color): number[] {
    return this.triangleOrder
      .map((vertexIndex) => {
        const pos = cloneBuf(this.vertices[vertexIndex]);
        vec3.transformMat4(pos, this.matrix, pos);

        return bufferGenerator.generate(pos[0], pos[1], pos[2], this.params.colorMap[vertexIndex] || color);
      })
      .flat();
  }
}

export class BlankGeometry extends Geometry {
  protected wireframeOrder = [];
  protected triangleOrder = [];
  protected params = {};

  constructor() {
    super();
  }

  recompute() {}
}

export class CircleGeometry extends Geometry {
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

  private updateWireframeOrder() {
    this.wireframeOrder = triangulateWireFrameOrder(this.vertices.length);
  }

  private updateTriangleOrder() {
    this.triangleOrder = lossyTriangulate(
      Array(this.vertices.length)
        .fill(0)
        .map((_, index) => index)
    ).flat();
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

    this.updateTriangleOrder();
    this.updateWireframeOrder();
  }
}

export class Spline2dGeometry extends Geometry {
  protected wireframeOrder: number[];
  protected triangleOrder: number[];
  protected params: Spline2dGeometryParams;

  constructor(points: SplinePoint2d[], color: Color, thickness: number, detail: number) {
    super();

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
      color: color,
      vertexColors: []
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

  private getVertexCount() {
    return this.triangleOrder.length * BUF_LEN;
  }

  getWireframeVertexCount() {
    return this.getVertexCount();
  }

  getTriangleVertexCount() {
    return this.getVertexCount();
  }

  getCurves() {
    return this.params.curves;
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
          prevColor = prevColors.at(-1) || null;
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

  private updateWireframeOrder() {
    this.wireframeOrder = triangulateWireFrameOrder(this.vertices.length);
  }

  recompute() {
    this.params.vertexColors = [];
    this.vertices = [];

    let verticesTop: Vertex[] = [];
    const verticesBottom: Vertex[] = [];

    let currentDistance = 0;
    let interpolationStarted = false;

    outer: for (let i = 0; i < this.params.curves.length; i++) {
      const detail = this.params.curves[i].getDetail() || this.params.detail;
      const step = 1 / detail;

      const distanceRatio = currentDistance / this.params.distance;
      if (distanceRatio > this.params.interpolateLimit) break;

      const curveLength = this.params.curves[i].getLength();
      currentDistance += curveLength;
      const sectionRatio = curveLength / this.params.distance;

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

        const [point2d, slope] = this.params.curves[i].interpolateSlope(currentInterpolation);
        const point = vector3FromVector2(point2d);

        const normal = vector2(-slope[1], slope[0]);
        vec2.normalize(normal, normal);
        vec2.scale(normal, this.params.thickness / 2, normal);

        const colors = this.params.curves[i].getColors().map((c) => (c ? c : this.params.color));
        const vertexColor = interpolateColors(colors, currentInterpolation);

        this.params.vertexColors.push(vertexColor);

        const vertTop = vertex(point[0] + normal[0], point[1] + normal[1], 0, vertexColor);
        verticesTop.push(vertTop);

        const vertBottom = vertex(point[0] - normal[0], point[1] - normal[1], 0, vertexColor);
        verticesBottom.unshift(vertBottom);

        if (atLimit) {
          break outer;
        }
      }
    }

    verticesTop = verticesTop.concat(verticesBottom);

    const tempColors = [...this.params.vertexColors];
    tempColors.reverse();
    this.params.vertexColors = this.params.vertexColors.concat(tempColors);

    this.vertices = verticesTop.map((vertex) => vertex.getPos());
    this.triangleOrder = lossyTriangulate(
      Array(verticesTop.length)
        .fill(0)
        .map((_, index) => index)
    ).flat();

    this.updateWireframeOrder();
  }

  getWireframeBuffer(color: Color) {
    return this.wireframeOrder
      .map((vertexIndex) => {
        const vertex = cloneBuf(this.vertices[vertexIndex]);

        vec3.transformMat4(vertex, this.matrix, vertex);

        return bufferGenerator.generate(vertex[0], vertex[1], vertex[2], color);
      })
      .flat();
  }

  getTriangleBuffer(_: Color) {
    return this.triangleOrder
      .map((vertexIndex) => {
        const vertex = cloneBuf(this.vertices[vertexIndex]);

        vec3.transformMat4(vertex, this.matrix, vertex);

        return bufferGenerator.generate(
          vertex[0],
          vertex[1],
          vertex[2],
          this.params.vertexColors[vertexIndex]
        );
      })
      .flat();
  }
}

export class Line2dGeometry extends Geometry {
  protected wireframeOrder = [0, 1, 2, 3, 0, 2];
  protected triangleOrder = [0, 1, 3, 2];
  protected params: Line2dGeometryParams;

  constructor(pos: Vector2, to: Vector2, thickness: number) {
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

export class Line3dGeometry extends Geometry {
  protected wireframeOrder = [0, 1, 2, 3, 0, 2];
  protected triangleOrder = [0, 1, 2, 3, 0];
  protected params: Line3dGeometryParams;

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

export class PolygonGeometry extends Geometry {
  protected wireframeOrder: number[];
  protected triangleOrder: number[];
  protected params: PolygonGeometryParams;

  constructor(points: Vertex[]) {
    super();

    this.wireframeOrder = [];
    this.triangleOrder = [];

    this.params = {
      points
    };

    this.recompute();
  }

  recompute() {
    this.vertices = this.params.points.map((point) => point.getPos());

    this.triangleOrder = lossyTriangulate(
      Array(this.vertices.length)
        .fill(0)
        .map((_, index) => index)
    ).flat();

    this.wireframeOrder = triangulateWireFrameOrder(this.vertices.length);
  }

  getTriangleBuffer(color: Color) {
    return this.triangleOrder
      .map((vertexIndex) => {
        const vertex = cloneBuf(this.vertices[vertexIndex]);

        vec3.transformMat4(vertex, this.matrix, vertex);

        return bufferGenerator.generate(
          vertex[0],
          vertex[1],
          0,
          this.params.points[vertexIndex].getColor() || color
        );
      })
      .flat();
  }
}
