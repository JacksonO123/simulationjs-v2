import { vec3, mat4, vec2, vec4 } from 'wgpu-matrix';
import { Camera } from './simulation.js';
import type {
  Vector2,
  Vector3,
  LerpFunc,
  VertexColorMap,
  Mat4,
  AnySimulationElement,
  VertexParamGeneratorInfo
} from './types.js';
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
import { VertexCache, bufferGenerator, logger, rotateMat4, vector3ToPixelRatio } from './internalUtils.js';
import { modelProjMatOffset } from './constants.js';

export abstract class SimulationElement {
  protected pos: Vector3;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected abstract geometry: Geometry<any>;
  protected color: Color;
  protected wireframe: boolean;
  protected vertexCache: VertexCache;
  protected rotation: Vector3;
  protected modelMatrix: Mat4;
  private uniformBuffer: GPUBuffer | null;
  isInstanced: boolean;

  /**
   * @param pos - Expected to be adjusted to devicePixelRatio before reaching constructor
   */
  constructor(pos: Vector3, rotation: Vector3, color = new Color()) {
    this.pos = pos;
    this.color = color;
    this.vertexCache = new VertexCache();
    this.wireframe = false;
    this.isInstanced = false;
    this.rotation = rotation;
    this.uniformBuffer = null;
    this.modelMatrix = matrix4();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getModelMatrix(_: Camera) {
    return this.modelMatrix;
  }

  getUniformBuffer(device: GPUDevice, mat: Mat4) {
    if (!this.uniformBuffer) {
      const uniformBufferSize = 4 * 16 + 4 * 16 + 4 * 2 + 8; // 4x4 matrix + 4x4 matrix + vec2<f32> + 8 bc 144 is cool
      this.uniformBuffer = device.createBuffer({
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
      });
    }

    device.queue.writeBuffer(this.uniformBuffer, modelProjMatOffset, mat);

    return this.uniformBuffer;
  }

  protected updateModelMatrix3d() {
    mat4.identity(this.modelMatrix);
    mat4.translate(this.modelMatrix, this.pos, this.modelMatrix);
    mat4.rotateZ(this.modelMatrix, this.rotation[2], this.modelMatrix);
    mat4.rotateY(this.modelMatrix, this.rotation[1], this.modelMatrix);
    mat4.rotateX(this.modelMatrix, this.rotation[0], this.modelMatrix);
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

  move(amount: Vector3, t = 0, f?: LerpFunc) {
    const tempAmount = cloneBuf(amount);
    vector3ToPixelRatio(tempAmount);
    const finalPos = cloneBuf(this.pos);
    vec3.add(finalPos, tempAmount, finalPos);

    return transitionValues(
      (p) => {
        this.pos[0] += tempAmount[0] * p;
        this.pos[1] += tempAmount[1] * p;
        this.pos[2] += tempAmount[2] * p;
        this.updateModelMatrix3d();
      },
      () => {
        this.pos = finalPos;
        this.updateModelMatrix3d();
      },
      t,
      f
    );
  }

  moveTo(pos: Vector3, t = 0, f?: LerpFunc) {
    const tempPos = cloneBuf(pos);
    vector3ToPixelRatio(tempPos);
    const diff = vector3();
    vec3.sub(tempPos, this.pos, diff);

    return transitionValues(
      (p) => {
        this.pos[0] += diff[0] * p;
        this.pos[1] += diff[1] * p;
        this.pos[2] += diff[2] * p;
        this.updateModelMatrix3d();
      },
      () => {
        this.pos = tempPos;
        this.updateModelMatrix3d();
      },
      t,
      f
    );
  }

  rotate(amount: Vector3, t = 0, f?: LerpFunc) {
    const tempAmount = cloneBuf(amount);
    const finalRotation = cloneBuf(amount);
    vec3.add(finalRotation, this.rotation, finalRotation);

    return transitionValues(
      (p) => {
        this.rotation[0] += tempAmount[0] * p;
        this.rotation[1] += tempAmount[1] * p;
        this.rotation[2] += tempAmount[2] * p;
        this.updateModelMatrix3d();
      },
      () => {
        this.rotation = finalRotation;
        this.updateModelMatrix3d();
      },
      t,
      f
    );
  }

  rotateTo(rot: Vector3, t = 0, f?: LerpFunc) {
    const diff = vec3.sub(rot, this.rotation) as Vector3;

    return transitionValues(
      (p) => {
        this.rotation[0] += diff[0] * p;
        this.rotation[1] += diff[1] * p;
        this.rotation[2] += diff[2] * p;
        this.updateModelMatrix3d();
      },
      () => {
        this.rotation = cloneBuf(rot);
        this.updateModelMatrix3d();
      },
      t,
      f
    );
  }

  getVertexCount() {
    if (this.vertexCache.shouldUpdate()) {
      this.geometry.recompute();
    }

    if (this.isWireframe()) {
      return this.geometry.getWireframeVertexCount();
    }

    return this.geometry.getTriangleVertexCount();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected defaultUpdateMatrix(_: Camera) {
    const matrix = matrix4();
    mat4.translate(matrix, this.pos, matrix);
    rotateMat4(matrix, this.rotation);
  }

  getBuffer(vertexParamGenerator?: VertexParamGeneratorInfo) {
    if (this.vertexCache.shouldUpdate()) {
      this.geometry.recompute();

      if (this.isInstanced) {
        bufferGenerator.setInstancing(true);
      }

      let resBuffer;
      if (this.isWireframe()) {
        resBuffer = this.geometry.getWireframeBuffer(this.color, vertexParamGenerator);
      } else {
        resBuffer = this.geometry.getTriangleBuffer(this.color, vertexParamGenerator);
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
    super(pos, rotation, color);

    this.pos = pos;
    vector3ToPixelRatio(this.pos);

    this.rotation = rotation;
  }
}

export abstract class SimulationElement2d extends SimulationElement {
  constructor(pos: Vector2, rotation = vector3(), color?: Color) {
    super(vector3FromVector2(pos), rotation, color);
    vector3ToPixelRatio(this.pos);
  }

  rotate2d(amount: number, t = 0, f?: LerpFunc) {
    return super.rotate(vector3(0, 0, amount), t, f);
  }

  rotateTo2d(rot: number, t = 0, f?: LerpFunc) {
    return super.rotateTo(vector3(0, 0, rot), t, f);
  }

  private updateModelMatrix2d(camera: Camera) {
    mat4.identity(this.modelMatrix);

    const pos = cloneBuf(this.pos);
    pos[1] = camera.getScreenSize()[1] + pos[1];
    mat4.translate(this.modelMatrix, pos, this.modelMatrix);

    mat4.rotateZ(this.modelMatrix, this.rotation[2], this.modelMatrix);
  }

  getModelMatrix(camera: Camera) {
    this.updateModelMatrix2d(camera);
    return this.modelMatrix;
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
    super(pos, vector3(0, 0, rotation), color);

    this.width = width * devicePixelRatio;
    this.height = height * devicePixelRatio;
    this.vertexColors = this.cloneColorMap(vertexColors || ({} as VertexColorMap));
    this.geometry = new SquareGeometry(this.width, this.height, centerOffset);
    this.geometry.setVertexColorMap(this.vertexColors);
  }

  setOffset(offset: Vector2) {
    this.geometry.setOffset(offset);
  }

  setOffsetInplace(offset: Vector2) {
    const diff = vector3FromVector2(offset);
    vec2.sub(diff, this.geometry.getOffset(), diff);
    vec2.mul(diff, vector2(this.width / devicePixelRatio, -this.height / devicePixelRatio), diff);
    this.setOffset(offset);
    this.move(diff);
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
}

export class Circle extends SimulationElement2d {
  protected geometry: CircleGeometry;
  private radius: number;
  private detail: number;

  constructor(pos: Vector2, radius: number, color?: Color, detail = 50) {
    super(pos, vector3(), color);

    this.radius = radius * devicePixelRatio;
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
}

export class Polygon extends SimulationElement2d {
  protected geometry: PolygonGeometry;
  private vertices: Vertex[];

  constructor(pos: Vector2, points: Vertex[], color?: Color, rotation?: number) {
    super(pos, vector3(0, 0, rotation), color);

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

    this.geometry = new Line3dGeometry(
      this.pos,
      this.to,
      this.thickness,
      pos.getColor() || this.getColor(),
      to.getColor()
    );
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
}

export class Line2d extends SimulationElement2d {
  protected geometry: Line2dGeometry;
  private to: Vector3;
  private thickness: number;

  constructor(from: Vertex, to: Vertex, thickness = 1) {
    super(vector2FromVector3(from.getPos()), vector3(), from.getColor() || undefined);

    this.thickness = thickness * devicePixelRatio;

    this.to = to.getPos();
    vec2.sub(this.to, this.pos, this.to);

    this.geometry = new Line2dGeometry(
      this.pos,
      this.to,
      this.thickness,
      from.getColor() || this.getColor(),
      to.getColor()
    );
  }

  setStart(pos: Vector3, t = 0, f?: LerpFunc) {
    return this.moveTo(pos, t, f);
  }

  setEnd(pos: Vector3, t = 0, f?: LerpFunc) {
    const tempPos = cloneBuf(pos);
    vector3ToPixelRatio(tempPos);
    // vec2.sub(tempPos, this.getPos(), tempPos);
    const diff = vector3();
    vec2.sub(tempPos, this.to, diff);

    return transitionValues(
      (p) => {
        this.to[0] += diff[0] * p;
        this.to[1] += diff[1] * p;
        this.vertexCache.updated();
      },
      () => {
        this.to[0] = tempPos[0];
        this.to[1] = tempPos[1];
        this.vertexCache.updated();
      },
      t,
      f
    );
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
    const slopeVector = vector2(1);

    while (vectors.length > 2) {
      const newVectors: Vector2[] = [];

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

    const resVector = vector2();
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

  clone() {
    return new SplinePoint2d(
      this.start,
      this.end,
      this.control1,
      this.control2,
      this.rawControls,
      this.detail
    );
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
    super(tempPos, vector3(), pos.getColor() || undefined);

    this.thickness = thickness * devicePixelRatio;
    this.detail = detail;
    this.interpolateStart = 0;
    this.interpolateLimit = 1;
    this.length = 0;

    this.geometry = new Spline2dGeometry(points, this.getColor(), this.thickness, this.detail);

    this.estimateLength();
  }

  private estimateLength() {
    this.length = 0;
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

  updatePoint(pointIndex: number, newPoint: SplinePoint2d) {
    this.geometry.updatePoint(pointIndex, newPoint);
    this.estimateLength();
    this.vertexCache.updated();
  }

  updatePointAbsolute(pointIndex: number, newPoint: SplinePoint2d) {
    const clonePoint = newPoint.clone();

    const start = clonePoint.getStart()?.getPos() || vector3();
    const end = clonePoint.getEnd().getPos();
    const pos = this.getPos();

    vec3.sub(start, pos, start);
    vec3.sub(end, pos, end);

    this.geometry.updatePoint(pointIndex, clonePoint);
    this.estimateLength();
    this.vertexCache.updated();
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

    if (curves.length === 0) return [vector2(), vector2()];
    return curves[index].interpolateSlope(diff);
  }

  interpolate(t: number) {
    const [vec] = this.interpolateSlope(t);
    return vec;
  }
}

export class Instance<T extends AnySimulationElement> extends SimulationElement3d {
  protected geometry: BlankGeometry;
  private obj: T;
  private instanceMatrix: Mat4[];
  private matrixBuffer: GPUBuffer | null;
  private device: GPUDevice | null;
  private baseMat: Mat4;

  constructor(obj: T, numInstances: number) {
    super(vector3());

    this.device = null;
    this.matrixBuffer = null;
    obj.isInstanced = true;
    this.obj = obj;
    this.instanceMatrix = [];
    this.is3d = Boolean((obj as SimulationElement3d).is3d);
    this.geometry = new BlankGeometry();

    this.baseMat = matrix4();

    if (typeof obj.getRotation() === 'number') {
      mat4.rotateZ(this.baseMat, obj.getRotation(), this.baseMat);
    } else {
      rotateMat4(this.baseMat, obj.getRotation() as Vector3);
    }

    for (let i = 0; i < numInstances; i++) {
      const clone = cloneBuf(this.baseMat);
      this.instanceMatrix.push(clone);
    }
  }

  setNumInstances(numInstances: number) {
    if (numInstances < 0) throw logger.error('Num instances is less than 0');

    const oldLen = this.instanceMatrix.length;
    if (numInstances < oldLen) {
      const diff = oldLen - numInstances;
      this.instanceMatrix.splice(oldLen - diff, diff);
      return;
    }

    const oldArr = this.instanceMatrix;
    this.instanceMatrix = Array(numInstances);

    for (let i = 0; i < numInstances; i++) {
      if (i < oldLen) {
        this.instanceMatrix[i] = oldArr[i];
        continue;
      }

      const clone = cloneBuf(this.baseMat);
      this.instanceMatrix[i] = clone;
    }
  }

  setInstance(instance: number, transformation: Mat4) {
    if (instance >= this.instanceMatrix.length || instance < 0) return;
    this.instanceMatrix[instance] = transformation;
  }

  private mapBuffer() {
    if (!this.device || this.matrixBuffer === null) return;

    const buf = new Float32Array(this.instanceMatrix.map((mat) => [...mat]).flat());
    this.device.queue.writeBuffer(this.matrixBuffer, 0, buf.buffer, buf.byteOffset, buf.byteLength);
    this.matrixBuffer.unmap();
  }

  getInstances() {
    return this.instanceMatrix;
  }

  getNumInstances() {
    return this.instanceMatrix.length;
  }

  getMatrixBuffer(device: GPUDevice) {
    if (!this.matrixBuffer) {
      const minSize = 640;
      const size = Math.max(minSize, this.instanceMatrix[0].byteLength * this.instanceMatrix.length);

      this.matrixBuffer = device.createBuffer({
        size,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      });
    }

    this.mapBuffer();

    return this.matrixBuffer;
  }

  getVertexCount() {
    return this.obj.getVertexCount();
  }

  getGeometryType() {
    return this.obj.getGeometryType();
  }

  getBuffer() {
    return this.obj.getBuffer();
  }
}
