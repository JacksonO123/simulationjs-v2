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
    fill(newColor, t = 0, f) {
        const diffR = newColor.r - this.color.r;
        const diffG = newColor.g - this.color.g;
        const diffB = newColor.b - this.color.b;
        const diffA = newColor.a - this.color.a;
        const finalColor = newColor.clone();
        return transitionValues((p) => {
            this.color.r += diffR * p;
            this.color.g += diffG * p;
            this.color.b += diffB * p;
            this.color.a += diffA * p;
        }, () => {
            this.color = finalColor;
        }, t, f);
    }
    getColor() {
        return this.color;
    }
    move(amount, t = 0, f) {
        vec3ToPixelRatio(amount);
        const finalPos = vec3.create();
        vec3.add(finalPos, this.pos, amount);
        return transitionValues((p) => {
            const x = amount[0] * p;
            const y = amount[1] * p;
            vec3.add(this.pos, this.pos, vec3From(x, y));
        }, () => {
            this.pos = finalPos;
        }, t, f);
    }
    moveTo(pos, t = 0, f) {
        vec3ToPixelRatio(pos);
        const diff = vec3.create();
        vec3.sub(diff, pos, this.pos);
        return transitionValues((p) => {
            const x = diff[0] * p;
            const y = diff[1] * p;
            vec3.add(this.pos, this.pos, vec3From(x, y));
        }, () => {
            this.pos = pos;
        }, t, f);
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
    rotateTo(angle, t = 0, f) {
        const diff = angle - this.rotation;
        return transitionValues((p) => {
            this.rotation += diff * p;
        }, () => {
            this.rotation = angle;
        }, t, f);
    }
    scale(amount, t = 0, f) {
        const finalWidth = this.width * amount;
        const finalHeight = this.height * amount;
        const diffWidth = finalWidth - this.width;
        const diffHeight = finalHeight - this.height;
        return transitionValues((p) => {
            this.width += diffWidth * p;
            this.height += diffHeight * p;
        }, () => {
            this.width = finalWidth;
            this.height = finalHeight;
        }, t, f);
    }
    setWidth(num, t = 0, f) {
        const diffWidth = num - this.width;
        return transitionValues((p) => {
            this.width += diffWidth * p;
        }, () => {
            this.width = num;
        }, t, f);
    }
    setHeight(num, t = 0, f) {
        const diffHeight = num - this.height;
        return transitionValues((p) => {
            this.height += diffHeight * p;
        }, () => {
            this.height = num;
        }, t, f);
    }
    getTriangleCount() {
        return 2;
    }
    getBuffer() {
        const topLeft = vec3.fromValues(-this.width / 2, -this.height / 2, 0);
        vec3ToPixelRatio(topLeft);
        vec3.rotateZ(topLeft, topLeft, vec3.create(), this.rotation);
        vec3.add(topLeft, topLeft, this.getPos());
        const topRight = vec3.fromValues(this.width / 2, -this.height / 2, 0);
        vec3ToPixelRatio(topRight);
        vec3.rotateZ(topRight, topRight, vec3.create(), this.rotation);
        vec3.add(topRight, topRight, this.getPos());
        const bottomLeft = vec3.fromValues(-this.width / 2, this.height / 2, 0);
        vec3ToPixelRatio(bottomLeft);
        vec3.rotateZ(bottomLeft, bottomLeft, vec3.create(), this.rotation);
        vec3.add(bottomLeft, bottomLeft, this.getPos());
        const bottomRight = vec3.fromValues(this.width / 2, this.height / 2, 0);
        vec3ToPixelRatio(bottomRight);
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
export function vec3ToPixelRatio(vec) {
    vec3.mul(vec, vec, vec3From(devicePixelRatio, devicePixelRatio, devicePixelRatio));
}
