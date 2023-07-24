import { vec3 } from 'gl-matrix';
import { Color, LerpFunc, transitionValues } from './simulation';

export abstract class SimulationElement {
  private pos: vec3;
  private color: Color;
  constructor(pos: vec3, color = new Color()) {
    this.pos = pos;
    this.color = color;
  }
  getPos() {
    return this.pos;
  }
  fill(newColor: Color) {
    // TODO: lerp here
    this.color = newColor;
  }
  getColor() {
    return this.color;
  }
  abstract getBuffer(): Float32Array;
  abstract getTriangleCount(): number;
}

export class Square extends SimulationElement {
  private width: number;
  private height: number;
  private rotation = 0;
  constructor(pos: vec3, width: number, height: number, color?: Color) {
    super(pos, color);
    this.width = width;
    this.height = height;
  }
  rotate(amount: number, t = 0, f?: LerpFunc) {
    const finalRotation = this.rotation + amount;

    return transitionValues(
      (p) => {
        this.rotation += amount * p;
      },
      () => {
        this.rotation = finalRotation;
      },
      t,
      f
    );
  }
  getTriangleCount() {
    return 2;
  }
  getBuffer() {
    const topLeft = vec3.fromValues(
      (-this.width / 2) * devicePixelRatio,
      (-this.height / 2) * devicePixelRatio,
      0
    );
    vec3.rotateZ(topLeft, topLeft, vec3.create(), this.rotation);
    vec3.add(topLeft, topLeft, this.getPos());

    const topRight = vec3.fromValues(
      (this.width / 2) * devicePixelRatio,
      (-this.height / 2) * devicePixelRatio,
      0
    );
    vec3.rotateZ(topRight, topRight, vec3.create(), this.rotation);
    vec3.add(topRight, topRight, this.getPos());

    const bottomLeft = vec3.fromValues(
      (-this.width / 2) * devicePixelRatio,
      (this.height / 2) * devicePixelRatio,
      0
    );
    vec3.rotateZ(bottomLeft, bottomLeft, vec3.create(), this.rotation);
    vec3.add(bottomLeft, bottomLeft, this.getPos());

    const bottomRight = vec3.fromValues(
      (this.width / 2) * devicePixelRatio,
      (this.height / 2) * devicePixelRatio,
      0
    );
    vec3.rotateZ(bottomRight, bottomRight, vec3.create(), this.rotation);
    vec3.add(bottomRight, bottomRight, this.getPos());

    const triangles = generateTriangles([topLeft, topRight, bottomRight, bottomLeft]);
    const colorBuffer = this.getColor().toBuffer();
    let buffer: number[] = [];
    triangles.forEach((tri) => {
      tri.forEach((pos) => {
        const arr = [pos[0], pos[1], 0, ...colorBuffer];
        buffer.push(...arr);
      });
    });

    return new Float32Array(buffer);
  }
}

function generateTriangles(points: vec3[]) {
  const res: (readonly [vec3, vec3, vec3])[] = [];

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
