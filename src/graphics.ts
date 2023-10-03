import { mat4, vec3, vec4 } from 'gl-matrix';
import { Camera, Color, LerpFunc, transitionValues } from './simulation';

export abstract class SimulationElement {
  private pos: vec3;
  private color: Color;
  camera: Camera | null = null;
  triangleCache: TriangleCache;
  /*
   * position is adjusted for device pixel ratio
   */
  constructor(pos: vec3, color = new Color()) {
    this.pos = pos;
    vec3ToPixelRatio(this.pos);
    this.color = color;
    this.triangleCache = new TriangleCache();
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
        this.triangleCache.updated();
      },
      () => {
        this.color = finalColor;
        this.triangleCache.updated();
      },
      t,
      f
    );
  }
  getColor() {
    return this.color;
  }
  move(amount: vec3, t = 0, f?: LerpFunc) {
    vec3ToPixelRatio(amount);

    const finalPos = vec3.create();
    vec3.add(finalPos, this.pos, amount);

    return transitionValues(
      (p) => {
        const x = amount[0] * p;
        const y = amount[1] * p;
        const z = amount[2] * p;
        vec3.add(this.pos, this.pos, vec3From(x, y, z));
        this.triangleCache.updated();
      },
      () => {
        this.pos = finalPos;
        this.triangleCache.updated();
      },
      t,
      f
    );
  }
  moveTo(pos: vec3, t = 0, f?: LerpFunc) {
    vec3ToPixelRatio(pos);

    const diff = vec3.create();
    vec3.sub(diff, pos, this.pos);

    return transitionValues(
      (p) => {
        const x = diff[0] * p;
        const y = diff[1] * p;
        const z = diff[2] * p;
        vec3.add(this.pos, this.pos, vec3From(x, y, z));
        this.triangleCache.updated();
      },
      () => {
        this.pos = pos;
        this.triangleCache.updated();
      },
      t,
      f
    );
  }
  getTriangleCount() {
    return this.triangleCache.getTriangleCount();
  }
  abstract getBuffer(force: boolean): Float32Array;
}

export class Square extends SimulationElement {
  private width: number;
  private height: number;
  private rotation: vec3;
  constructor(pos: vec3, width: number, height: number, color?: Color, rotation = vec3From()) {
    vec3ToPixelRatio(pos);
    super(pos, color);
    this.width = width * devicePixelRatio;
    this.height = height * devicePixelRatio;
    this.rotation = rotation;
    if (rotation[0] !== 0 || rotation[1] !== 0 || rotation[2] !== 0) {
      this.triangleCache.updated();
    }
  }
  rotate(amount: vec3, t = 0, f?: LerpFunc) {
    const finalRotation = vec3From();
    vec3.add(finalRotation, this.rotation, amount);

    return transitionValues(
      (p) => {
        const toRotate = vec3From();
        vec3.scale(toRotate, amount, p);
        vec3.add(this.rotation, this.rotation, toRotate);
        this.triangleCache.updated();
      },
      () => {
        this.rotation = finalRotation;
        this.triangleCache.updated();
      },
      t,
      f
    );
  }
  rotateTo(angle: vec3, t = 0, f?: LerpFunc) {
    const diff = vec3From();
    vec3.sub(diff, angle, this.rotation);

    return transitionValues(
      (p) => {
        const toRotate = vec3From();
        vec3.scale(toRotate, diff, p);
        vec3.add(this.rotation, this.rotation, toRotate);
        this.triangleCache.updated();
      },
      () => {
        this.rotation = angle;
        this.triangleCache.updated();
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
        this.triangleCache.updated();
      },
      () => {
        this.width = finalWidth;
        this.triangleCache.updated();
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
        this.triangleCache.updated();
      },
      () => {
        this.height = finalHeight;
        this.triangleCache.updated();
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
        this.triangleCache.updated();
      },
      () => {
        this.width = finalWidth;
        this.height = finalHeight;
        this.triangleCache.updated();
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
        this.triangleCache.updated();
      },
      () => {
        this.width = num;
        this.triangleCache.updated();
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
        this.triangleCache.updated();
      },
      () => {
        this.height = num;
        this.triangleCache.updated();
      },
      t,
      f
    );
  }
  getBuffer(force: boolean) {
    if (!this.camera) throw new Error('Expected camera');

    let triangles: Triangles = [];
    if (this.triangleCache.shouldUpdate() || force) {
      const bottomLeftPos = vec3From(-this.width / 2, -this.height / 2, 0);
      const bottomLeft = projectPoint(bottomLeftPos, this.camera, this.rotation, this.getPos());

      const bottomRightPos = vec3From(this.width / 2, -this.height / 2, 0);
      const bottomRight = projectPoint(bottomRightPos, this.camera, this.rotation, this.getPos());

      const topLeftPos = vec3From(-this.width / 2, this.height / 2, 0);
      const topLeft = projectPoint(topLeftPos, this.camera, this.rotation, this.getPos());

      const topRightPos = vec3From(this.width / 2, this.height / 2, 0);
      const topRight = projectPoint(topRightPos, this.camera, this.rotation, this.getPos());

      triangles = generateTriangles([
        topLeft,
        topRight,
        bottomRight,
        vec3From(bottomLeft[0], bottomLeft[1], bottomLeft[2])
      ]);
      this.triangleCache.setCache(triangles);
    } else {
      triangles = this.triangleCache.getCache();
    }

    return trianglesAndColorToBuffer(triangles, this.getColor());
  }
}

type Triangles = (readonly [vec3, vec3, vec3])[];

class TriangleCache {
  private triangles: Triangles = [];
  private hasUpdated = true;
  constructor() {}
  setCache(triangles: Triangles) {
    this.triangles = triangles;
    this.hasUpdated = false;
  }
  getCache() {
    return this.triangles;
  }
  updated() {
    this.hasUpdated = true;
  }
  shouldUpdate() {
    return this.hasUpdated;
  }
  getTriangleCount() {
    return this.triangles.length;
  }
}

export class Circle extends SimulationElement {
  private radius: number;
  private detail = 100;
  constructor(pos: vec3, radius: number, color?: Color) {
    super(pos, color);

    this.radius = radius * devicePixelRatio;
  }
  setRadius(num: number, t = 0, f?: LerpFunc) {
    num *= devicePixelRatio;
    const diff = num - this.radius;

    return transitionValues(
      (p) => {
        this.radius += diff * p;
        this.triangleCache.updated();
      },
      () => {
        this.radius = num;
        this.triangleCache.updated();
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
        this.triangleCache.updated();
      },
      () => {
        this.radius = finalRadius;
        this.triangleCache.updated();
      },
      t,
      f
    );
  }
  getBuffer() {
    let triangles: Triangles = [];
    if (this.triangleCache.shouldUpdate()) {
      const points: vec3[] = [];
      // const rotationInc = (Math.PI * 2) / this.detail;
      for (let i = 0; i < this.detail; i++) {
        const vec = vec3From(1);
        // vec3.rotateZ(vec, vec, vec3.create(), rotationInc * i);
        vec3.scale(vec, vec, this.radius);
        vec3.add(vec, vec, this.getPos());
        points.push(vec);
      }
      triangles = generateTriangles(points);
      this.triangleCache.setCache(triangles);
    } else {
      triangles = this.triangleCache.getCache();
    }

    return trianglesAndColorToBuffer(triangles, this.getColor());
  }
}

export class Polygon extends SimulationElement {
  private points: vec3[];
  private rotation = 0;
  /*
   * points adjusted for device pixel ratio
   */
  constructor(pos: vec3, points: vec3[], color?: Color) {
    super(pos, color);

    this.points = points.map((point) => {
      vec3ToPixelRatio(point);
      return point;
    });
  }
  rotate(amount: number, t = 0, f?: LerpFunc) {
    const finalRotation = this.rotation + amount;

    return transitionValues(
      (p) => {
        this.rotation += amount * p;
        this.triangleCache.updated();
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
        this.triangleCache.updated();
      },
      () => {
        this.rotation = num;
      },
      t,
      f
    );
  }
  setPoints(newPoints: vec3[], t = 0, f?: LerpFunc) {
    const points: vec3[] = newPoints.map((point) => {
      const vec = vec3From(...point);
      vec3ToPixelRatio(vec);
      return vec;
    });

    const lastPoint = this.points.length > 0 ? this.points[this.points.length - 1] : vec3.create();
    if (points.length > this.points.length) {
      while (points.length > this.points.length) {
        this.points.push(vec3From(lastPoint[0], lastPoint[1]));
      }
    }

    const initial = this.points.map((p) => vec3From(...p));
    const changes = [
      ...points.map((p, i) => {
        const vec = vec3.create();
        vec3.sub(vec, p, this.points[i]);
        return vec;
      }),
      ...this.points.slice(points.length, this.points.length).map((point) => {
        const vec = vec3From(...points[points.length - 1]) || vec3.create();
        vec3.sub(vec, vec, point);
        return vec;
      })
    ];

    return transitionValues(
      (p) => {
        this.points = this.points.map((point, i) => {
          const change = vec3From(...changes[i]);
          vec3.scale(change, change, p);
          vec3.add(point, point, change);
          return point;
        });
        this.triangleCache.updated();
      },
      () => {
        this.points = initial.map((p, i) => {
          const vec = vec3.create();
          vec3.add(vec, p, changes[i]);
          return vec;
        });
        this.points.splice(points.length, this.points.length);
        this.triangleCache.updated();
      },
      t,
      f
    );
  }
  getBuffer() {
    let triangles: Triangles = [];
    if (this.triangleCache.shouldUpdate()) {
      let newPoints: vec3[] = this.points.map((vec) => {
        const newPoint = vec3.create();
        vec3.add(newPoint, vec, this.getPos());
        // vec3.rotateZ(newPoint, newPoint, vec3.create(), this.rotation);

        return newPoint;
      });

      triangles = generateTriangles(newPoints);
      this.triangleCache.setCache(triangles);
    } else {
      triangles = this.triangleCache.getCache();
    }

    return trianglesAndColorToBuffer(triangles, this.getColor());
  }
}

export class Line extends SimulationElement {
  private lineEl: Square;
  constructor(pos1: vec3, pos2: vec3, thickness = 1, color?: Color) {
    vec3ToPixelRatio(pos1);
    vec3ToPixelRatio(pos2);
    const avgX = (pos1[0] + pos2[0]) / 2;
    const avgY = (pos1[1] + pos2[1]) / 2;
    const avgZ = (pos1[2] + pos2[2]) / 2;
    const pos = vec3From(avgX, avgY, avgZ);

    super(pos, color);

    const dist = vec3.distance(pos1, pos2);
    const diffX = pos2[0] - pos[0];
    const diffY = pos2[1] - pos[1];
    const angle = Math.atan2(diffY, diffX);

    this.lineEl = new Square(pos, dist, Math.max(thickness, 0), color, vec3From(0, 0, angle));
  }
  setLength(length: number, t = 0, f?: LerpFunc) {
    return this.lineEl.setWidth(length, t, f);
  }
  scale(amount: number, t = 0, f?: LerpFunc) {
    return this.lineEl.scaleWidth(amount, t, f);
  }
  setThickness(num: number, t = 0, f?: LerpFunc) {
    return this.lineEl.setHeight(num, t, f);
  }
  getTriangleCount() {
    return this.lineEl.triangleCache.getTriangleCount();
  }
  getBuffer(force: boolean) {
    return this.lineEl.getBuffer(force);
  }
}

function trianglesAndColorToBuffer(triangles: Triangles, color: Color, shape2d = true) {
  const colorBuffer = color.toBuffer();
  let buffer: number[] = [];
  triangles.forEach((tri) => {
    tri.forEach((pos) => {
      buffer.push(pos[0], pos[1], shape2d ? 0 : pos[2], ...colorBuffer);
    });
  });

  return new Float32Array(buffer);
}

function generateTriangles(points: vec3[]) {
  const res: Triangles = [];

  let facingRight = true;
  let rightOffset = 0;
  let leftOffset = 0;

  while (rightOffset < points.length - leftOffset - 2) {
    if (facingRight) {
      const triangle = [
        points[rightOffset],
        points[rightOffset + 1],
        points[points.length - leftOffset - 1]
      ] as const;
      res.push(triangle);

      rightOffset++;
    } else {
      const triangle = [
        points[rightOffset],
        points[points.length - leftOffset - 1],
        points[points.length - leftOffset - 2]
      ] as const;
      res.push(triangle);

      leftOffset++;
    }

    facingRight = !facingRight;
  }

  return res;
}

export function vec3From(x = 0, y = 0, z = 0) {
  return vec3.fromValues(x, y, z);
}

export function vec4From(x = 0, y = 0, z = 0, w = 1) {
  return vec4.fromValues(x, y, z, w);
}

export function vec3ToPixelRatio(vec: vec3) {
  vec3.mul(vec, vec, vec3From(devicePixelRatio, devicePixelRatio, devicePixelRatio));
}

export function vec4ToPixelRatio(vec: vec4) {
  vec4.mul(vec, vec, vec4From(devicePixelRatio, devicePixelRatio, devicePixelRatio, 1));
}

export function randomInt(range: number, min = 0) {
  return Math.floor(Math.random() * (range - min)) + min;
}

export function randomColor(a = 1) {
  return new Color(randomInt(255), randomInt(255), randomInt(255), a);
}

function projectPoint(point: vec3, camera: Camera, rotation: vec3, pos = vec3From()) {
  const tempPos = vec3.clone(pos);
  const projectionMatrix = mat4.create();

  mat4.perspective(
    projectionMatrix,
    camera.getFov(),
    camera.getAspectRatio(),
    camera.getNear(),
    camera.getFar()
  );

  const cameraRotation = camera.getRotation();
  mat4.rotate(projectionMatrix, projectionMatrix, cameraRotation[2], [0, 0, 1]);
  mat4.rotate(projectionMatrix, projectionMatrix, cameraRotation[1], [0, 1, 0]);
  mat4.rotate(projectionMatrix, projectionMatrix, cameraRotation[0], [1, 0, 0]);

  vec3.add(tempPos, tempPos, camera.getPos());
  vec3.rotateZ(tempPos, tempPos, vec3From(), cameraRotation[2]);
  vec3.rotateY(tempPos, tempPos, vec3From(), cameraRotation[1]);
  vec3.rotateX(tempPos, tempPos, vec3From(), cameraRotation[0]);
  mat4.translate(projectionMatrix, projectionMatrix, tempPos);

  const modelViewMatrix = mat4.create();
  mat4.rotate(modelViewMatrix, modelViewMatrix, rotation[2], [0, 0, 1]);
  mat4.rotate(modelViewMatrix, modelViewMatrix, rotation[1], [0, 1, 0]);
  mat4.rotate(modelViewMatrix, modelViewMatrix, rotation[0], [1, 0, 0]);

  const mat = mat4.create();
  mat4.translate(mat, modelViewMatrix, point);

  const newPoint = vec3.create();
  vec3.transformMat4(newPoint, newPoint, mat);
  vec3.transformMat4(newPoint, newPoint, projectionMatrix);
  vec3ToPixelRatio(newPoint);

  return newPoint;
}
