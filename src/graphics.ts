import { vec3, quat, mat4, vec2, vec4 } from 'wgpu-matrix';
import { Camera, Color, transitionValues } from './simulation.js';
import { BUF_LEN } from './constants.js';
import type { Vector2, Vector3, LerpFunc, VertexColorMap, Vector4 } from './types.js';

class VertexCache {
  private vertices: number[] = [];
  private hasUpdated = true;

  constructor() {}

  setCache(vertices: number[]) {
    this.vertices = vertices;
    this.hasUpdated = false;
  }

  getCache() {
    return this.vertices;
  }

  updated() {
    this.hasUpdated = true;
  }

  shouldUpdate() {
    return this.hasUpdated;
  }

  getVertexCount() {
    return this.vertices.length / BUF_LEN;
  }
}

export class Vertex {
  private pos: Vector3;
  private color: Color | null;
  private is3d: boolean;
  private readonly uv: Vector2;

  constructor(x = 0, y = 0, z = 0, color?: Color, is3dPoint = true, uv = vector2()) {
    this.pos = vector3(x, y, z);
    this.color = color ? color : null;
    this.is3d = is3dPoint;
    this.uv = uv;
  }

  getPos() {
    return this.pos;
  }

  getColor() {
    return this.color;
  }

  getUv() {
    return this.uv;
  }

  setColor(color: Color) {
    this.color = color;
  }

  setPos(pos: Vector3) {
    this.pos = pos;
  }

  setX(x: number) {
    this.pos[0] = x;
  }

  setY(y: number) {
    this.pos[1] = y;
  }

  setZ(z: number) {
    this.pos[2] = z;
  }

  setIs3d(is3d: boolean) {
    this.is3d = is3d;
  }

  clone() {
    return new Vertex(
      this.pos[0],
      this.pos[1],
      this.pos[2],
      this.color?.clone(),
      this.is3d,
      cloneBuf(this.uv)
    );
  }

  toBuffer(defaultColor: Color) {
    if (this.is3d)
      return vertexBuffer3d(this.pos[0], this.pos[1], this.pos[2], this.color || defaultColor, this.uv);
    else return vertexBuffer2d(this.pos[0], this.pos[1], this.color || defaultColor, this.uv);
  }
}

export abstract class SimulationElement {
  private pos: Vector3;
  private color: Color;
  camera: Camera | null;
  vertexCache: VertexCache;

  constructor(pos: Vector3, color = new Color()) {
    this.pos = pos;
    vec3ToPixelRatio(this.pos);
    this.color = color;
    this.vertexCache = new VertexCache();
    this.camera = null;
  }

  setPos(pos: Vector3) {
    this.pos = pos;
  }

  getPos() {
    return this.pos;
  }

  setCamera(camera: Camera) {
    this.camera = camera;
  }

  fill(newColor: Color, t = 0, f?: LerpFunc) {
    const diffR = newColor.r - this.color.r;
    const diffG = newColor.g - this.color.g;
    const diffB = newColor.b - this.color.b;
    const diffA = newColor.a - this.color.a;

    const finalColor = newColor.clone();

    return transitionValues(
      (p) => {
        this.color.r += diffR * p;
        this.color.g += diffG * p;
        this.color.b += diffB * p;
        this.color.a += diffA * p;
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

  getColor() {
    return this.color;
  }

  move(amount: Vector3, t = 0, f?: LerpFunc) {
    const finalPos = vec3.create();
    vec3.add(finalPos, this.pos, amount);

    return transitionValues(
      (p) => {
        const x = amount[0] * p;
        const y = amount[1] * p;
        const z = amount[2] * p;
        vec3.add(this.pos, this.pos, vector3(x, y, z));
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
    const diff = vec3.create();
    vec3.sub(diff, pos, this.pos);

    return transitionValues(
      (p) => {
        const x = diff[0] * p;
        const y = diff[1] * p;
        const z = diff[2] * p;
        vec3.add(this.pos, this.pos, vector3(x, y, z));
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

  abstract getBuffer(camera: Camera, force: boolean): number[];
}

export class Plane extends SimulationElement {
  private points: Vertex[];
  private rotation: Vector3;

  constructor(pos: Vector3, points: Vertex[], color?: Color, rotation = vector3()) {
    super(pos, color);
    this.points = points;
    this.rotation = rotation;
  }

  setPoints(newPoints: Vertex[]) {
    this.points = newPoints;
  }

  rotate(amount: Vector3, t = 0, f?: LerpFunc) {
    const initial = vec3.clone(this.rotation);

    return transitionValues(
      (p) => {
        const step = vector3();
        vec3.scale(amount, p, step);
        vec3.add(this.rotation, step, this.rotation);
        this.vertexCache.updated();
      },
      () => {
        vec3.add(initial, amount, initial);
        this.rotation = initial;
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  rotateTo(angle: Vector3, t = 0, f?: LerpFunc) {
    const diff = vector3();
    vec3.sub(angle, this.rotation, diff);

    return transitionValues(
      (p) => {
        const toRotate = vector3();
        vec3.scale(diff, p, toRotate);
        vec3.add(this.rotation, toRotate, this.rotation);
        this.vertexCache.updated();
      },
      () => {
        this.rotation = angle;
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  getBuffer(_: Camera, force: boolean) {
    if (this.vertexCache.shouldUpdate() || force) {
      let resBuffer: number[] = [];
      const triangles = lossyTriangulate(this.points).flat();

      triangles.forEach((verticy) => {
        const rot = quat.create();
        quat.fromEuler(...this.rotation, 'xyz', rot);

        const mat = mat4.create();
        mat4.fromQuat(rot, mat);

        const out = vector3();

        vec3.transformMat4(verticy.getPos(), mat, out);
        vec3.add(out, this.getPos(), out);

        let vertexColor = verticy.getColor();
        vertexColor = vertexColor ? vertexColor : this.getColor();

        resBuffer = resBuffer.concat(vertexBuffer3d(out[0], out[1], out[2], vertexColor));
      });

      this.vertexCache.setCache(resBuffer);

      return resBuffer;
    }

    return this.vertexCache.getCache();
  }
}

export class Square extends SimulationElement {
  private width: number;
  private height: number;
  private rotation: number;
  private vertexColors: VertexColorMap;
  private points: Vector2[];
  /**
   * @param vertexColors{Record<number, Color>} - 0 is top left vertex, numbers increase clockwise
   */
  constructor(
    pos: Vector2,
    width: number,
    height: number,
    color?: Color,
    rotation?: number,
    vertexColors?: VertexColorMap
  ) {
    super(vec3fromVec2(pos), color);

    this.width = width * devicePixelRatio;
    this.height = height * devicePixelRatio;
    this.rotation = rotation || 0;
    this.vertexColors = vertexColors || ({} as VertexColorMap);
    this.points = [
      vector2(this.width / 2, this.height / 2),
      vector2(-this.width / 2, this.height / 2),
      vector2(-this.width / 2, -this.height / 2),
      vector2(this.width / 2, -this.height / 2)
    ];
  }

  scaleWidth(amount: number, t = 0, f?: LerpFunc) {
    const finalWidth = this.width * amount;
    const diffWidth = finalWidth - this.width;

    return transitionValues(
      (p) => {
        this.width += diffWidth * p;
        this.vertexCache.updated();
      },
      () => {
        this.width = finalWidth;
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
        this.vertexCache.updated();
      },
      () => {
        this.height = finalHeight;
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
        this.vertexCache.updated();
      },
      () => {
        this.width = finalWidth;
        this.height = finalHeight;
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
        this.vertexCache.updated();
      },
      () => {
        this.width = num;
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
        this.vertexCache.updated();
      },
      () => {
        this.height = num;
        this.vertexCache.updated();
      },
      t,
      f
    );
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

  setRotation(newRotation: number, t = 0, f?: LerpFunc) {
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

  getBuffer(camera: Camera, force: boolean): number[] {
    if (this.vertexCache.shouldUpdate() || force) {
      let resBuffer: number[] = [];
      const vertexOrder = [0, 1, 2, 0, 2, 3];

      const rotationMat = mat4.identity();
      mat4.rotateZ(rotationMat, this.rotation, rotationMat);

      const points = this.points.map((vec) => {
        const pos = vector2();

        vec2.add(vec, pos, pos);
        vec2.transformMat4(vec, rotationMat, pos);
        vec2.add(vec, this.getPos(), pos);

        pos[1] = camera.getScreenSize()[1] - pos[1];
        pos[0] += this.width / 2;
        pos[1] -= this.height / 2;

        return pos;
      });

      vertexOrder.forEach((vertex) => {
        let vertexColor = this.vertexColors[vertex as keyof VertexColorMap];
        vertexColor = vertexColor ? vertexColor : this.getColor();

        resBuffer = resBuffer.concat(vertexBuffer2d(points[vertex][0], points[vertex][1], vertexColor));
      });

      this.vertexCache.setCache(resBuffer);

      return resBuffer;
    }

    return this.vertexCache.getCache();
  }
}

export class Circle extends SimulationElement {
  private radius: number;
  private detail = 100;
  constructor(pos: Vector2, radius: number, color?: Color, detail = 50) {
    super(vec3fromVec2(pos), color);

    this.radius = radius * devicePixelRatio;
    this.detail = detail;
  }
  setRadius(num: number, t = 0, f?: LerpFunc) {
    num *= devicePixelRatio;
    const diff = num - this.radius;

    return transitionValues(
      (p) => {
        this.radius += diff * p;
        this.vertexCache.updated();
      },
      () => {
        this.radius = num;
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
        this.vertexCache.updated();
      },
      () => {
        this.radius = finalRadius;
        this.vertexCache.updated();
      },
      t,
      f
    );
  }
  getBuffer(camera: Camera, force: boolean) {
    if (this.vertexCache.shouldUpdate() || force) {
      const points: Vertex[] = [];
      const rotationInc = (Math.PI * 2) / this.detail;
      for (let i = 0; i < this.detail; i++) {
        const mat = mat4.identity();
        mat4.rotateZ(mat, rotationInc * i, mat);

        const vec = vector3(this.radius);

        vec3.transformMat4(vec, mat, vec);
        vec3.add(vec, this.getPos(), vec);

        const screenSize = camera.getScreenSize();

        points.push(new Vertex(vec[0], screenSize[1] - vec[1], vec[2], this.getColor(), false));
      }

      const vertices = lossyTriangulate(points).reduce<number[]>((acc, curr) => {
        curr.forEach((vertex) => acc.push(...vertex.toBuffer(this.getColor())));
        return acc;
      }, []);

      this.vertexCache.setCache(vertices);

      return vertices;
    }

    return this.vertexCache.getCache();
  }
}

export class Polygon extends SimulationElement {
  private vertices: Vertex[];
  private rotation = 0;

  constructor(pos: Vector3, vertices: Vertex[], color?: Color) {
    super(pos, color);

    this.vertices = vertices.map((vertex) => {
      const newVertex = vertex.clone();
      newVertex.setZ(0);
      newVertex.setIs3d(false);
      return vertex;
    });
  }

  rotate(amount: number, t = 0, f?: LerpFunc) {
    const finalRotation = this.rotation + amount;

    return transitionValues(
      (p) => {
        this.rotation += amount * p;
        this.vertexCache.updated();
      },
      () => {
        this.rotation = finalRotation;
      },
      t,
      f
    );
  }

  rotateTo(num: number, t = 0, f?: LerpFunc) {
    const diff = num - this.rotation;

    return transitionValues(
      (p) => {
        this.rotation += diff * p;
        this.vertexCache.updated();
      },
      () => {
        this.rotation = num;
      },
      t,
      f
    );
  }

  setPoints(newVertices: Vertex[], t = 0, f?: LerpFunc) {
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

        this.vertices.push(
          new Vertex(lastPos[0], lastPos[1], 0, lastVert.getColor() || this.getColor(), false)
        );
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

    const initialColors = this.vertices.map((vert) => (vert.getColor() || this.getColor()).toVec4());
    const colorChanges = [
      ...vertices.map((vert, i) => {
        const diff = (vert.getColor() || this.getColor()).diff(
          this.vertices[i].getColor() || this.getColor()
        );

        return diff.toVec4();
      }),
      ...(this.vertices.length > vertices.length
        ? this.vertices.slice(vertices.length, this.vertices.length).map((vert) => {
            const toColor = vertices[vertices.length - 1].getColor();
            return (toColor || this.getColor()).diff(vert.getColor() || this.getColor()).toVec4();
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
          vec4.add((vert.getColor() || this.getColor()).toVec4(), colorChange, colorChange);

          vert.setPos(posChange);
          vert.setColor(colorFromVec4(colorChange));
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
          vert.setColor(colorFromVec4(initColor));
        });
        this.vertices.splice(vertices.length, this.vertices.length);
        this.vertexCache.updated();
      },
      t,
      f
    );
  }

  getBuffer(camera: Camera, force: boolean) {
    if (this.vertexCache.shouldUpdate() || force) {
      let resBuffer: number[] = [];

      const rotationMat = mat4.identity();
      mat4.rotateZ(rotationMat, this.rotation, rotationMat);

      lossyTriangulate(this.vertices)
        .flat()
        .forEach((vert) => {
          const pos = vector3();

          vec3.add(vert.getPos(), pos, pos);
          vec3.transformMat4(pos, rotationMat, pos);
          vec3.add(this.getPos(), pos, pos);

          pos[1] = camera.getScreenSize()[1] - pos[1];

          resBuffer = resBuffer.concat(vertexBuffer2d(pos[0], pos[1], vert.getColor() || this.getColor()));
        });

      this.vertexCache.setCache(resBuffer);

      return resBuffer;
    }

    return this.vertexCache.getCache();
  }
}

// optomized for speed, depending on orientation of vertices as input, shape may not be preserved
function lossyTriangulate(vertices: Vertex[]) {
  const res: (readonly [Vertex, Vertex, Vertex])[] = [];

  let facingRight = true;
  let rightOffset = 0;
  let leftOffset = 0;

  while (rightOffset < vertices.length - leftOffset - 2) {
    if (facingRight) {
      const triangle = [
        vertices[rightOffset],
        vertices[rightOffset + 1],
        vertices[vertices.length - leftOffset - 1]
      ] as const;
      res.push(triangle);

      rightOffset++;
    } else {
      const triangle = [
        vertices[rightOffset],
        vertices[vertices.length - leftOffset - 1],
        vertices[vertices.length - leftOffset - 2]
      ] as const;
      res.push(triangle);

      leftOffset++;
    }

    facingRight = !facingRight;
  }

  return res;
}

function vertexBuffer3d(x: number, y: number, z: number, color: Color, uv = vector2()) {
  return [x, y, z, 1, ...color.toBuffer(), ...uv, 1];
}

function vertexBuffer2d(x: number, y: number, color: Color, uv = vector2()) {
  return [x, y, 0, 1, ...color.toBuffer(), ...uv, 0];
}

function vec3ToPixelRatio(vec: Vector3) {
  vec3.mul(vec, vector3(devicePixelRatio, devicePixelRatio, devicePixelRatio), vec);
}

function cloneBuf<T extends Float32Array>(buf: T) {
  return new Float32Array(buf) as T;
}

export function vector4(x = 0, y = 0, z = 0, w = 0): Vector4 {
  return vec4.fromValues(x, y, z, w);
}

export function vector3(x = 0, y = 0, z = 0): Vector3 {
  return vec3.fromValues(x, y, z);
}

export function vector2(x = 0, y = 0): Vector2 {
  return vec2.fromValues(x, y, 0);
}

export function vec3fromVec2(vec: Vector2): Vector3 {
  return vector3(vec[0], vec[1]);
}

export function colorFromVec4(vec: Vector4) {
  return new Color(vec[0], vec[1], vec[2], vec[3]);
}

export function randomInt(range: number, min = 0) {
  return Math.floor(Math.random() * (range - min)) + min;
}

export function randomColor(a = 1) {
  return new Color(randomInt(255), randomInt(255), randomInt(255), a);
}

export function vertex(x?: number, y?: number, z?: number, color?: Color, is3dPoint?: boolean, uv?: Vector2) {
  return new Vertex(x, y, z, color, is3dPoint, uv);
}

export function color(r?: number, g?: number, b?: number, a?: number) {
  return new Color(r, g, b, a);
}

export function colorf(val: number, a?: number) {
  return color(val, val, val, a);
}
