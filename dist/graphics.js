import { vec3 } from 'gl-matrix';
import { Color, transitionValues } from './simulation';
export class SimulationElement {
    pos;
    color;
    constructor(pos, color = new Color()) {
        this.pos = pos;
        this.color = color;
    }
    getPos() {
        return this.pos;
    }
    fill(newColor) {
        // TODO: lerp here
        this.color = newColor;
    }
    getColor() {
        return this.color;
    }
}
export class Square extends SimulationElement {
    width;
    height;
    rotation = 0;
    constructor(pos, width, height, color) {
        super(pos, color);
        this.width = width;
        this.height = height;
    }
    rotate(amount, t = 0, f) {
        const finalRotation = this.rotation + amount;
        return transitionValues((p) => {
            this.rotation += amount * p;
        }, () => {
            this.rotation = finalRotation;
        }, t, f);
    }
    getTriangleCount() {
        return 2;
    }
    getBuffer() {
        const topLeft = vec3.fromValues((-this.width / 2) * devicePixelRatio, (-this.height / 2) * devicePixelRatio, 0);
        vec3.rotateZ(topLeft, topLeft, vec3.create(), this.rotation);
        vec3.add(topLeft, topLeft, this.getPos());
        const topRight = vec3.fromValues((this.width / 2) * devicePixelRatio, (-this.height / 2) * devicePixelRatio, 0);
        vec3.rotateZ(topRight, topRight, vec3.create(), this.rotation);
        vec3.add(topRight, topRight, this.getPos());
        const bottomLeft = vec3.fromValues((-this.width / 2) * devicePixelRatio, (this.height / 2) * devicePixelRatio, 0);
        vec3.rotateZ(bottomLeft, bottomLeft, vec3.create(), this.rotation);
        vec3.add(bottomLeft, bottomLeft, this.getPos());
        const bottomRight = vec3.fromValues((this.width / 2) * devicePixelRatio, (this.height / 2) * devicePixelRatio, 0);
        vec3.rotateZ(bottomRight, bottomRight, vec3.create(), this.rotation);
        vec3.add(bottomRight, bottomRight, this.getPos());
        const triangles = generateTriangles([topLeft, topRight, bottomRight, bottomLeft]);
        const colorBuffer = this.getColor().toBuffer();
        let buffer = [];
        triangles.forEach((tri) => {
            tri.forEach((pos) => {
                const arr = [pos[0], pos[1], 0, ...colorBuffer];
                buffer.push(...arr);
            });
        });
        return new Float32Array(buffer);
    }
}
function generateTriangles(points) {
    const res = [];
    let facingRight = true;
    let rightOffset = 0;
    let leftOffset = 0;
    while (rightOffset < points.length - leftOffset - 2) {
        if (facingRight) {
            const triangle = [
                points[rightOffset],
                points[rightOffset + 1],
                points[points.length - leftOffset - 1]
            ];
            res.push(triangle);
            rightOffset++;
        }
        else {
            const triangle = [
                points[rightOffset],
                points[points.length - leftOffset - 1],
                points[points.length - leftOffset - 2]
            ];
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
