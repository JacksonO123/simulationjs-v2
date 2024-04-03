import { vec3, mat4, vec2, vec4 } from 'wgpu-matrix';
import { Camera } from './simulation.js';
import type { Vector2, Vector3, LerpFunc, VertexColorMap, ElementRotation, Mat4 } from './types.js';
import {
  Vertex,
  cloneBuf,
  color,
  colorFromVector4,
  vector2,
  vector3,
  vertex,
  Color,
  transitionValues,
  vector2FromVector3,
  matrix4,
  vector3FromVector2,
  distance2d
} from './utils.js';
import {
  BlankGeometry,
  CircleGeometry,
  CubeGeometry,
  Geometry,
  Line2dGeometry,
  Line3dGeometry,
  PlaneGeometry,
  PolygonGeometry,
  Spline2dGeometry,
  SquareGeometry
} from './geometry.js';
import {
  VertexCache,
  bufferGenerator,
  logger,
  rotateMat4,
  vector2ToPixelRatio,
  vector3ToPixelRatio
} from './internalUtils.js';

export abstract class SimulationElement<T extends Vector2 | Vector3 = Vector3> {
  protected abstract pos: T;
  protected abstract geometry: Geometry;
  protected color: Color;
  protected wireframe: boolean;
  protected vertexCache: VertexCache;
  protected rotation: ElementRotation<T>;
  isInstanced: boolean;

  /**
   * @param pos - Expected to be adjusted to devicePixelRatio before reaching constructor
   */
  constructor(color = new Color(), rotation: ElementRotation<T>) {
    this.color = color;
    this.vertexCache = new VertexCache();
    this.wireframe = false;
    this.rotation = rotation;
    this.isInstanced = false;
  }

  getGeometryType() {
    return this.geometry.getType();
  }

  setWireframe(wireframe: boolean) {
    this.wireframe = wireframe;
  }

  isWireframe() {
    return this.wireframe;
  }

  getColor() {
    return this.color;
  }

  getPos() {
    return this.pos;
  }

  getRotation() {
    return this.rotation;
  }

  fill(newColor: Color, t = 0, f?: LerpFunc) {
    const diff = newColor.diff(this.color);
    const finalColor = newColor.clone();

    return transitionValues(
      (p) => {
        this.color.r += diff.r * p;
        this.color.g += diff.g * p;
        this.color.b += diff.b * p;
        this.color.a += diff.a * p;
        this.vertexCache.updated();
      },
      () => {
        this.color = finalColor;
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  abstract move(amount: T, t?: number, f?: LerpFunc): Promise<void>;
  abstract moveTo(pos: T, t?: number, f?: LerpFunc): Promise<void>;

  abstract rotate(amount: ElementRotation<T>, t?: number, f?: LerpFunc): Promise<void>;
  abstract rotateTo(rotation: ElementRotation<T>, t?: number, f?: LerpFunc): Promise<void>;

  protected abstract updateMatrix(camera: Camera): void;

  getVertexCount() {
    if (this.vertexCache.shouldUpdate()) {
      this.geometry.recompute();
    }

    if (this.isWireframe()) {
      return this.geometry.getWireframeVertexCount();
    }

    return this.geometry.getTriangleVertexCount();
  }

  protected defaultUpdateMatrix(camera: Camera) {
    const matrix = matrix4();

    if (typeof this.rotation === 'number') {
      const pos = vector3FromVector2(this.pos as Vector2);
      pos[1] = camera.getScreenSize()[1] + pos[1];

      mat4.translate(matrix, pos, matrix);
      mat4.rotateZ(matrix, this.rotation, matrix);
    } else {
      mat4.translate(matrix, this.pos, matrix);
      rotateMat4(matrix, this.rotation);
    }

    this.geometry.updateMatrix(matrix);
  }

  getBuffer(camera: Camera) {
    if (this.vertexCache.shouldUpdate() || camera.hasUpdated()) {
      this.updateMatrix(camera);
      this.geometry.recompute();

      if (this.isInstanced) {
        bufferGenerator.setInstancing(true);
      }

      let resBuffer = [];
      if (this.isWireframe()) {
        resBuffer = this.geometry.getWireframeBuffer(this.color);
      } else {
        resBuffer = this.geometry.getTriangleBuffer(this.color);
      }

      bufferGenerator.setInstancing(false);

      this.vertexCache.setCache(resBuffer);

      return resBuffer;
    }

    return this.vertexCache.getCache();
  }
}

export abstract class SimulationElement3d extends SimulationElement {
  protected pos: Vector3;
  protected rotation: Vector3;
  is3d = true;

  constructor(pos: Vector3, rotation = vector3(), color?: Color) {
    super(color, rotation);

    this.pos = pos;
    vector3ToPixelRatio(this.pos);

    this.rotation = rotation;
  }

  rotate(amount: Vector3, t = 0, f?: LerpFunc) {
    const finalRotation = cloneBuf(this.rotation);
    vec3.add(finalRotation, amount, finalRotation);

    return transitionValues(
      (p) => {
        this.rotation[0] += amount[0] * p;
        this.rotation[1] += amount[1] * p;
        this.rotation[2] += amount[2] * p;
        this.vertexCache.updated();
      },
      () => {
        this.rotation = finalRotation;
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  rotateTo(rot: Vector3, t = 0, f?: LerpFunc) {
    const diff = vector3();
    vec3.sub(rot, this.rotation, diff);

    return transitionValues(
      (p) => {
        this.rotation[0] += diff[0] * p;
        this.rotation[1] += diff[1] * p;
        this.rotation[2] += diff[2] * p;
        this.vertexCache.updated();
      },
      () => {
        this.rotation = rot;
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  move(amount: Vector3, t = 0, f?: LerpFunc) {
    const finalPos = cloneBuf(this.pos);
    vec3.add(finalPos, amount, finalPos);

    return transitionValues(
      (p) => {
        this.pos[0] += amount[0] * p;
        this.pos[1] += amount[1] * p;
        this.pos[2] += amount[2] * p;

        this.vertexCache.updated();
      },
      () => {
        this.pos = finalPos;
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  moveTo(pos: Vector3, t = 0, f?: LerpFunc) {
    const diff = vector3();
    vec3.sub(pos, this.pos, diff);

    return transitionValues(
      (p) => {
        this.pos[0] += diff[0] * p;
        this.pos[1] += diff[1] * p;
        this.pos[2] += diff[2] * p;
        this.vertexCache.updated();
      },
      () => {
        this.pos = pos;
        this.vertexCache.updated();
      },
      t,
      f
    );
  }
}

export abstract class SimulationElement2d extends SimulationElement<Vector2> {
  protected pos: Vector2;
  rotation: number;

  constructor(pos: Vector2, rotation = 0, color?: Color) {
    super(color, rotation);

    this.pos = pos;

    this.rotation = rotation;
  }

  rotate(rotation: number, t = 0, f?: LerpFunc) {
    const finalRotation = this.rotation + rotation;

    return transitionValues(
      (p) => {
        this.rotation += rotation * p;
        this.vertexCache.updated();
      },
      () => {
        this.rotation = finalRotation;
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  rotateTo(newRotation: number, t = 0, f?: LerpFunc) {
    const diff = newRotation - this.rotation;

    return transitionValues(
      (p) => {
        this.rotation += diff * p;
        this.vertexCache.updated();
      },
      () => {
        this.rotation = newRotation;
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  move(amount: Vector2, t = 0, f?: LerpFunc) {
    const finalPos = vector2();
    vec3.add(amount, this.pos, finalPos);

    return transitionValues(
      (p) => {
        this.pos[0] += amount[0] * p;
        this.pos[1] += amount[1] * p;
        this.vertexCache.updated();
      },
      () => {
        this.pos = finalPos;
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  moveTo(pos: Vector2, t = 0, f?: LerpFunc) {
    const diff = vector2();
    vec2.sub(pos, this.pos, diff);

    return transitionValues(
      (p) => {
        this.pos[0] += diff[0] * p;
        this.pos[1] += diff[1] * p;
        this.vertexCache.updated();
      },
      () => {
        this.pos = pos;
        this.vertexCache.updated();
      },
      t,
      f
    );
  }
}

export class Plane extends SimulationElement3d {
  protected geometry: PlaneGeometry;
  points: Vertex[];

  constructor(pos: Vector3, points: Vertex[], color?: Color, rotation = vector3()) {
    super(pos, rotation, color);
    this.rotation = rotation;
    this.points = points;

    this.geometry = new PlaneGeometry(points);
  }

  setPoints(newPoints: Vertex[]) {
    this.points = newPoints;
    this.vertexCache.updated();
  }

  protected updateMatrix(camera: Camera) {
    this.defaultUpdateMatrix(camera);
  }
}

export class Square extends SimulationElement2d {
  protected geometry: SquareGeometry;
  private width: number;
  private height: number;
  private vertexColors: VertexColorMap;
  /**
   * @param centerOffset{Vector2} - A vector2 of values from 0 to 1
   * @param vertexColors{Record<number, Color>} - 0 is top left vertex, numbers increase clockwise
   */
  constructor(
    pos: Vector2,
    width: number,
    height: number,
    color?: Color,
    rotation?: number,
    centerOffset?: Vector2,
    vertexColors?: VertexColorMap
  ) {
    super(pos, rotation, color);

    vector2ToPixelRatio(this.pos);

    this.width = width * devicePixelRatio;
    this.height = height * devicePixelRatio;
    this.vertexColors = this.cloneColorMap(vertexColors || ({} as VertexColorMap));
    this.geometry = new SquareGeometry(this.width, this.height, centerOffset);
    this.geometry.setVertexColorMap(this.vertexColors);
  }

  private cloneColorMap(colorMap: VertexColorMap) {
    const newColorMap: VertexColorMap = {};

    Object.entries(colorMap).forEach(([key, value]) => {
      newColorMap[+key] = value.clone();
    });

    return newColorMap;
  }

  setVertexColors(newColorMap: VertexColorMap, t = 0, f?: LerpFunc) {
    const colorMap = this.cloneColorMap(newColorMap);
    const diffMap: VertexColorMap = {};

    Object.entries(colorMap).forEach(([key, value]) => {
      if (!this.vertexColors[+key]) {
        this.vertexColors[+key] = color();
      }

      diffMap[+key] = value.diff(this.vertexColors[+key] || color());
    });

    Object.entries(this.vertexColors).forEach(([key, value]) => {
      if (!diffMap[+key]) {
        const clone = value.clone();
        clone.r *= -1;
        clone.g *= -1;
        clone.b *= -1;

        diffMap[+key] = clone;
      }
    });

    return transitionValues(
      (p) => {
        Object.entries(diffMap).forEach(([key, value]) => {
          const color = this.vertexColors[+key];
          color.r += value.r * p;
          color.g += value.g * p;
          color.b += value.b * p;
          color.a += value.a * p;
          this.vertexColors[+key] = color;
        });

        this.geometry.setVertexColorMap(this.vertexColors);
        this.vertexCache.updated();
      },
      () => {
        this.vertexColors = colorMap;
        this.geometry.setVertexColorMap(this.vertexColors);
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  scaleWidth(amount: number, t = 0, f?: LerpFunc) {
    const finalWidth = this.width * amount;
    const diffWidth = finalWidth - this.width;

    return transitionValues(
      (p) => {
        this.width += diffWidth * p;
        this.geometry.setWidth(this.width);
        this.vertexCache.updated();
      },
      () => {
        this.width = finalWidth;
        this.geometry.setWidth(this.width);
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  scaleHeight(amount: number, t = 0, f?: LerpFunc) {
    const finalHeight = this.height * amount;
    const diffHeight = finalHeight - this.height;

    return transitionValues(
      (p) => {
        this.height += diffHeight * p;
        this.geometry.setHeight(this.height);
        this.vertexCache.updated();
      },
      () => {
        this.height = finalHeight;
        this.geometry.setHeight(this.height);
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  scale(amount: number, t = 0, f?: LerpFunc) {
    const finalWidth = this.width * amount;
    const finalHeight = this.height * amount;
    const diffWidth = finalWidth - this.width;
    const diffHeight = finalHeight - this.height;

    return transitionValues(
      (p) => {
        this.width += diffWidth * p;
        this.height += diffHeight * p;
        this.geometry.setWidth(this.width);
        this.geometry.setHeight(this.height);
        this.vertexCache.updated();
      },
      () => {
        this.width = finalWidth;
        this.height = finalHeight;
        this.geometry.setWidth(this.width);
        this.geometry.setHeight(this.height);
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  setWidth(num: number, t = 0, f?: LerpFunc) {
    num *= devicePixelRatio;
    const diffWidth = num - this.width;

    return transitionValues(
      (p) => {
        this.width += diffWidth * p;
        this.geometry.setWidth(this.width);
        this.vertexCache.updated();
      },
      () => {
        this.width = num;
        this.geometry.setWidth(this.width);
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  setHeight(num: number, t = 0, f?: LerpFunc) {
    num *= devicePixelRatio;
    const diffHeight = num - this.height;

    return transitionValues(
      (p) => {
        this.height += diffHeight * p;
        this.geometry.setHeight(this.height);
        this.vertexCache.updated();
      },
      () => {
        this.height = num;
        this.geometry.setHeight(this.height);
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  protected updateMatrix(camera: Camera) {
    const pos = cloneBuf(this.pos);

    pos[1] = camera.getScreenSize()[1] + pos[1];

    const matrix = matrix4();
    mat4.translate(matrix, vector3FromVector2(pos), matrix);
    mat4.rotateZ(matrix, this.rotation, matrix);

    this.geometry.updateMatrix(matrix);
  }
}

export class Circle extends SimulationElement2d {
  protected geometry: CircleGeometry;
  private radius: number;
  private detail: number;

  constructor(pos: Vector2, radius: number, color?: Color, detail = 50) {
    super(pos, 0, color);

    this.radius = radius;
    this.detail = detail;
    this.geometry = new CircleGeometry(this.radius, this.detail);
  }

  setRadius(num: number, t = 0, f?: LerpFunc) {
    num *= devicePixelRatio;
    const diff = num - this.radius;

    return transitionValues(
      (p) => {
        this.radius += diff * p;
        this.geometry.setRadius(this.radius);
        this.vertexCache.updated();
      },
      () => {
        this.radius = num;
        this.geometry.setRadius(this.radius);
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  scale(amount: number, t = 0, f?: LerpFunc) {
    const finalRadius = this.radius * amount;
    const diff = finalRadius - this.radius;

    return transitionValues(
      (p) => {
        this.radius += diff * p;
        this.geometry.setRadius(this.radius);
        this.vertexCache.updated();
      },
      () => {
        this.radius = finalRadius;
        this.geometry.setRadius(this.radius);
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  protected updateMatrix(camera: Camera) {
    this.defaultUpdateMatrix(camera);
  }
}

export class Polygon extends SimulationElement2d {
  protected geometry: PolygonGeometry;
  private vertices: Vertex[];

  constructor(pos: Vector2, points: Vertex[], color?: Color, rotation?: number) {
    super(pos, rotation, color);

    this.vertices = points;

    this.geometry = new PolygonGeometry(this.vertices);
  }

  getVertices() {
    return this.vertices;
  }

  setVertices(newVertices: Vertex[], t = 0, f?: LerpFunc) {
    const vertices = newVertices.map((vert) => {
      const newVertex = vert.clone();
      newVertex.setZ(0);
      newVertex.setIs3d(false);

      return newVertex;
    });

    const lastVert =
      this.vertices.length > 0 ? this.vertices[this.vertices.length - 1] : vertex(0, 0, 0, color(), false);

    if (vertices.length > this.vertices.length) {
      while (vertices.length > this.vertices.length) {
        const lastPos = lastVert.getPos();

        this.vertices.push(new Vertex(lastPos[0], lastPos[1], 0, lastVert.getColor() || this.color, false));
      }
    }

    const initialPositions = this.vertices.map((p) => cloneBuf(p.getPos()));
    const posChanges = [
      ...vertices.map((vert, i) => {
        const vec = vector3();
        vec3.sub(vert.getPos(), this.vertices[i].getPos(), vec);
        return cloneBuf(vec);
      }),
      ...(this.vertices.length > vertices.length
        ? this.vertices.slice(vertices.length, this.vertices.length).map((vert) => {
            const vec = cloneBuf(vertices[vertices.length - 1].getPos());
            vec3.sub(vec, vert.getPos(), vec);
            return vec;
          })
        : [])
    ];

    const initialColors = this.vertices.map((vert) => (vert.getColor() || this.color).toVec4());
    const colorChanges = [
      ...vertices.map((vert, i) => {
        const diff = (vert.getColor() || this.color).diff(this.vertices[i].getColor() || this.color);

        return diff.toVec4();
      }),
      ...(this.vertices.length > vertices.length
        ? this.vertices.slice(vertices.length, this.vertices.length).map((vert) => {
            const toColor = vertices[vertices.length - 1].getColor();
            return (toColor || this.color).diff(vert.getColor() || this.color).toVec4();
          })
        : [])
    ];

    return transitionValues(
      (p) => {
        this.vertices.forEach((vert, i) => {
          const posChange = cloneBuf(posChanges[i]);
          const colorChange = cloneBuf(colorChanges[i]);

          vec3.scale(posChange, p, posChange);
          vec3.add(vert.getPos(), posChange, posChange);

          vec4.scale(colorChange, p, colorChange);
          vec4.add((vert.getColor() || this.color).toVec4(), colorChange, colorChange);

          vert.setPos(posChange);
          vert.setColor(colorFromVector4(colorChange));
        });
        this.vertexCache.updated();
      },
      () => {
        this.vertices.forEach((vert, i) => {
          const initPos = initialPositions[i];
          const initColor = initialColors[i];

          vec3.add(initPos, posChanges[i], initPos);
          vec4.add(initColor, colorChanges[i], initColor);

          vert.setPos(initPos);
          vert.setColor(colorFromVector4(initColor));
        });
        this.vertices.splice(vertices.length, this.vertices.length);
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  protected updateMatrix(camera: Camera): void {
    this.defaultUpdateMatrix(camera);
  }
}

export class Line3d extends SimulationElement3d {
  protected geometry: Line3dGeometry;
  private to: Vector3;
  private thickness: number;

  constructor(pos: Vertex, to: Vertex, thickness: number) {
    super(pos.getPos(), vector3(), to.getColor() || undefined);

    this.thickness = thickness;

    this.to = to.getPos();
    vec3.scale(this.to, devicePixelRatio, this.to);
    vec3.sub(this.to, this.pos, this.to);

    this.geometry = new Line3dGeometry(this.pos, this.to, this.thickness);
  }

  setStart(pos: Vector3, t = 0, f?: LerpFunc) {
    return this.moveTo(pos, t, f);
  }

  setEnd(pos: Vector3, t = 0, f?: LerpFunc) {
    const diff = vector3();
    vec3.sub(pos, this.to, diff);

    return transitionValues(
      (p) => {
        this.to[0] += diff[0] * p;
        this.to[1] += diff[1] * p;
        this.to[2] += diff[2] * p;
        this.vertexCache.updated();
      },
      () => {
        this.to[0] = pos[0];
        this.to[1] = pos[1];
        this.to[2] = pos[2];
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  protected updateMatrix(camera: Camera): void {
    return this.defaultUpdateMatrix(camera);
  }
}

export class Line2d extends SimulationElement2d {
  protected geometry: Line2dGeometry;
  private to: Vector2;
  private thickness: number;

  constructor(from: Vertex, to: Vertex, thickness = 1) {
    super(vector2FromVector3(from.getPos()), 0, from.getColor() || undefined);

    this.thickness = thickness * devicePixelRatio;

    this.to = vector2FromVector3(to.getPos());
    vec2.scale(this.to, devicePixelRatio, this.to);
    vec2.sub(this.to, this.pos, this.to);

    this.geometry = new Line2dGeometry(this.pos, this.to, this.thickness);
  }

  setStart(pos: Vector2, t = 0, f?: LerpFunc) {
    return this.moveTo(pos, t, f);
  }

  setEnd(pos: Vector2, t = 0, f?: LerpFunc) {
    const diff = vector3();
    vec2.sub(pos, this.to, diff);

    return transitionValues(
      (p) => {
        this.to[0] += diff[0] * p;
        this.to[1] += diff[1] * p;
        this.vertexCache.updated();
      },
      () => {
        this.to[0] = pos[0];
        this.to[1] = pos[1];
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  protected updateMatrix(camera: Camera): void {
    return this.defaultUpdateMatrix(camera);
  }
}

export class Cube extends SimulationElement3d {
  protected geometry: CubeGeometry;
  private width: number;
  private height: number;
  private depth: number;

  constructor(pos: Vector3, width: number, height: number, depth: number, color?: Color, rotation?: Vector3) {
    super(pos, rotation, color);

    this.width = width * devicePixelRatio;
    this.height = height * devicePixelRatio;
    this.depth = depth * devicePixelRatio;
    this.rotation = rotation || vector3();

    this.geometry = new CubeGeometry(this.width, this.height, this.depth);
  }

  setWidth(width: number, t = 0, f?: LerpFunc) {
    width *= devicePixelRatio;
    const diff = width - this.width;

    return transitionValues(
      (p) => {
        this.width += diff * p;
        this.geometry.setWidth(this.width);
        this.vertexCache.updated();
      },
      () => {
        this.width = width;
        this.geometry.setWidth(this.width);
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  setHeight(height: number, t = 0, f?: LerpFunc) {
    height *= devicePixelRatio;
    const diff = height - this.width;

    return transitionValues(
      (p) => {
        this.height += diff * p;
        this.geometry.setHeight(this.height);
        this.vertexCache.updated();
      },
      () => {
        this.height = height;
        this.geometry.setHeight(this.height);
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  setDepth(depth: number, t = 0, f?: LerpFunc) {
    depth *= devicePixelRatio;
    const diff = depth - this.width;

    return transitionValues(
      (p) => {
        this.depth += diff * p;
        this.geometry.setDepth(this.depth);
        this.vertexCache.updated();
      },
      () => {
        this.depth = depth;
        this.geometry.setDepth(this.depth);
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  scale(amount: number, t = 0, f?: LerpFunc) {
    const finalWidth = this.width * amount;
    const finalHeight = this.height * amount;
    const finalDepth = this.depth * amount;

    const widthDiff = finalWidth - this.width;
    const heightDiff = finalHeight - this.height;
    const depthDiff = finalDepth - this.depth;

    return transitionValues(
      (p) => {
        this.width += widthDiff * p;
        this.height += heightDiff * p;
        this.depth += depthDiff * p;

        this.geometry.setWidth(this.width);
        this.geometry.setHeight(this.height);
        this.geometry.setDepth(this.depth);

        this.vertexCache.updated();
      },
      () => {
        this.width = finalWidth;
        this.height = finalHeight;
        this.depth = finalDepth;

        this.geometry.setWidth(this.width);
        this.geometry.setHeight(this.height);
        this.geometry.setDepth(this.depth);

        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  protected updateMatrix(camera: Camera) {
    this.defaultUpdateMatrix(camera);
  }
}

export class BezierCurve2d {
  private points: Vector2[];
  private length: number;

  constructor(points: Vector2[]) {
    if (points.length === 0) throw logger.error('Expected 1 or more points for BezierCurve2d');

    this.points = points;

    const dist = distance2d(points[0], points[points.length - 1]);

    this.length = this.estimateLength(dist);
  }

  interpolateSlope(t: number) {
    t = Math.max(0, Math.min(1, t));

    let vectors = this.points;
    let slopeVector = vector2(1);

    while (vectors.length > 2) {
      let newVectors: Vector2[] = [];

      for (let i = 1; i < vectors.length - 1; i++) {
        const from = vector2();
        const to = vector2();

        vec2.sub(vectors[i], vectors[i - 1], from);
        vec2.scale(from, t, from);
        vec2.add(from, vectors[i - 1], from);

        vec2.sub(vectors[i + 1], vectors[i], to);
        vec2.scale(to, t, to);
        vec2.add(to, vectors[i], to);

        if (i === 1) {
          newVectors.push(from);
        }

        newVectors.push(to);
      }

      vectors = newVectors;
    }

    vec2.sub(vectors[1], vectors[0], slopeVector);

    let resVector = vector2();
    vec2.scale(slopeVector, t, resVector);
    vec2.add(resVector, vectors[0], resVector);

    return [resVector, slopeVector] as const;
  }

  interpolate(t: number) {
    const [vec] = this.interpolateSlope(t);
    return vec;
  }

  getPoints() {
    return this.points;
  }

  estimateLength(detail: number) {
    let totalDist = 0;

    for (let i = 0; i < detail - 1; i++) {
      const t1 = i / detail;
      const t2 = (i + 1) / detail;

      const p1 = this.interpolate(t1);
      const p2 = this.interpolate(t2);

      const dist = distance2d(p1, p2);

      totalDist += dist;
    }

    return totalDist;
  }

  getLength() {
    return this.length;
  }
}

export class CubicBezierCurve2d extends BezierCurve2d {
  private detail: number | undefined;
  private colors: (Color | null)[];

  constructor(points: [Vector2, Vector2, Vector2, Vector2], detail?: number, colors?: (Color | null)[]) {
    super(points);

    this.detail = detail;
    this.colors = colors || [];
  }

  getDetail() {
    return this.detail;
  }

  getColors() {
    return this.colors;
  }
}

export class SplinePoint2d {
  private start: Vertex | null;
  private end: Vertex;
  private control1: Vector2 | null;
  private control2: Vector2;
  private rawControls: [Vector2, Vector2];
  private detail: number | undefined;

  constructor(
    start: Vertex | null,
    end: Vertex,
    control1: Vector2 | null,
    control2: Vector2,
    rawControls: [Vector2, Vector2],
    detail?: number
  ) {
    this.start = start;
    this.end = end;
    this.control1 = control1;
    this.control2 = control2;
    this.rawControls = rawControls;

    this.detail = detail;
  }

  getStart() {
    return this.start;
  }

  getEnd() {
    return this.end;
  }

  getControls() {
    return [this.control1, this.control2] as const;
  }

  getRawControls() {
    return this.rawControls;
  }

  getDetail() {
    return this.detail;
  }

  getColors(prevColor?: Color | null) {
    const colors: (Color | null)[] = [null, null];

    if (prevColor) {
      colors[0] = prevColor;
    } else if (this.start && this.start.getColor()) {
      colors[0] = this.start.getColor();
    }

    if (this.end.getColor()) {
      colors[1] = this.end.getColor();
    }

    if (colors.length > 2 && colors.at(-1) === null) {
      colors.pop();
    }

    return colors;
  }

  getVectorArray(prevEnd: Vector2 | null, prevControl: Vector2 | null) {
    const firstControl = cloneBuf(this.control1 || prevControl || vector2());

    if (prevEnd) {
      vec2.add(firstControl, prevEnd, firstControl);
    } else if (!this.start) {
      prevEnd = vector2();
    }

    return [
      this.start ? vector2FromVector3(this.start.getPos()) : (prevEnd as Vector2),
      firstControl,
      this.control2,
      vector2FromVector3(this.end.getPos())
    ] as const;
  }
}

export class Spline2d extends SimulationElement2d {
  protected geometry: Spline2dGeometry;
  private thickness: number;
  private detail: number;
  private interpolateStart: number;
  private interpolateLimit: number;
  private length: number;

  constructor(pos: Vertex, points: SplinePoint2d[], thickness = devicePixelRatio, detail = 40) {
    const tempPos = vector2FromVector3(pos.getPos());

    vector2ToPixelRatio(tempPos);

    super(tempPos, 0, pos.getColor() || undefined);

    this.thickness = thickness * devicePixelRatio;
    this.detail = detail;
    this.interpolateStart = 0;
    this.interpolateLimit = 1;
    this.length = 0;

    this.geometry = new Spline2dGeometry(points, this.getColor(), this.thickness, this.detail);

    this.estimateLength();
  }

  private estimateLength() {
    const curves = this.geometry.getCurves();

    for (let i = 0; i < curves.length; i++) {
      this.length += curves[i].getLength();
    }
  }

  getLength() {
    return this.length;
  }

  setInterpolateStart(start: number, t = 0, f?: LerpFunc) {
    const diff = start - this.interpolateStart;

    return transitionValues(
      (p) => {
        this.interpolateStart += diff * p;
        this.geometry.updateInterpolationStart(this.interpolateStart);
        this.vertexCache.updated();
      },
      () => {
        this.interpolateStart = start;
        this.geometry.updateInterpolationStart(this.interpolateStart);
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  setInterpolateLimit(limit: number, t = 0, f?: LerpFunc) {
    const diff = limit - this.interpolateLimit;

    return transitionValues(
      (p) => {
        this.interpolateLimit += diff * p;
        this.geometry.updateInterpolationLimit(this.interpolateLimit);
        this.vertexCache.updated();
      },
      () => {
        this.interpolateLimit = limit;
        this.geometry.updateInterpolationLimit(this.interpolateLimit);
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  setThickness(thickness: number, t = 0, f?: LerpFunc) {
    thickness *= devicePixelRatio;
    const diff = thickness - this.thickness;

    return transitionValues(
      (p) => {
        this.thickness += diff * p;
        this.geometry.updateThickness(this.thickness);
        this.vertexCache.updated();
      },
      () => {
        this.thickness = thickness;
        this.geometry.updateThickness(this.thickness);
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  interpolateSlope(t: number) {
    const curves = this.geometry.getCurves();
    const totalLength = this.length;
    let currentLength = 0;

    let index = 0;
    let diff = 0;

    for (let i = 0; i < curves.length; i++) {
      if ((currentLength + curves[i].getLength()) / totalLength >= t) {
        let dist = totalLength * t;
        dist -= currentLength;

        diff = dist / curves[i].getLength();

        index = i;
        break;
      }

      currentLength += curves[i].getLength();
    }

    return curves[index].interpolateSlope(diff);
  }

  interpolate(t: number) {
    const [vec] = this.interpolateSlope(t);
    return vec;
  }

  protected updateMatrix(camera: Camera) {
    this.defaultUpdateMatrix(camera);
  }
}

export class Instance<T extends SimulationElement2d | SimulationElement3d> extends SimulationElement3d {
  protected geometry: BlankGeometry;
  private obj: T;
  private instanceMatrix: Mat4[];
  private matrixBuffer: GPUBuffer | null;
  private device: GPUDevice | null;
  readonly isInstance = true;

  constructor(obj: T, numInstances: number) {
    super(vector3());

    this.device = null;
    this.matrixBuffer = null;
    obj.isInstanced = true;
    this.obj = obj;
    this.instanceMatrix = [];
    this.is3d = Boolean((obj as SimulationElement3d).is3d);
    this.geometry = new BlankGeometry();

    const mat = matrix4();

    if (typeof obj.getRotation() === 'number') {
      mat4.rotateZ(mat, obj.getRotation(), mat);
    } else {
      rotateMat4(mat, obj.getRotation() as Vector3);
    }

    for (let i = 0; i < numInstances; i++) {
      const clone = cloneBuf(mat);

      this.instanceMatrix.push(clone);
    }
  }

  private setMatrixBuffer() {
    if (!this.device || this.instanceMatrix.length === 0) return;

    this.matrixBuffer = this.device.createBuffer({
      size: this.instanceMatrix[0].length * 4 * this.instanceMatrix.length,
      usage: GPUBufferUsage.STORAGE,
      mappedAtCreation: true
    });

    const buf = this.instanceMatrix.map((mat) => [...mat]).flat();

    new Float32Array(this.matrixBuffer.getMappedRange()).set(buf);
    this.matrixBuffer.unmap();
  }

  getInstances() {
    return this.instanceMatrix;
  }

  getNumInstances() {
    return this.instanceMatrix.length;
  }

  setDevice(device: GPUDevice) {
    this.device = device;

    if (this.matrixBuffer === null) {
      this.setMatrixBuffer();
    }
  }

  getMatrixBuffer() {
    return this.matrixBuffer;
  }

  getVertexCount() {
    return this.obj.getVertexCount();
  }

  getGeometryType() {
    return this.obj.getGeometryType();
  }

  protected updateMatrix(_: Camera) {}

  getBuffer(camera: Camera) {
    return this.obj.getBuffer(camera);
  }
}
