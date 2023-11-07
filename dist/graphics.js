import { vec3, quat, mat4, vec2 } from 'wgpu-matrix';
import { Color, transitionValues } from './simulation.js';
class Vertex {
    pos;
    color;
    constructor(x, y, z, color) {
        this.pos = vector3(x, y, z);
        this.color = color ? color : null;
    }
    getPos() {
        return this.pos;
    }
    getColor() {
        return this.color;
    }
}
export class SimulationElement {
    pos;
    color;
    camera = null;
    triangleCache;
    constructor(pos, color = new Color()) {
        this.pos = pos;
        vec3ToPixelRatio(this.pos);
        this.color = color;
        this.triangleCache = new TriangleCache();
    }
    setPos(pos) {
        this.pos = pos;
    }
    getPos() {
        return this.pos;
    }
    setCamera(camera) {
        this.camera = camera;
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
            this.triangleCache.updated();
        }, () => {
            this.color = finalColor;
            this.triangleCache.updated();
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
            const z = amount[2] * p;
            vec3.add(this.pos, this.pos, vector3(x, y, z));
            this.triangleCache.updated();
        }, () => {
            this.pos = finalPos;
            this.triangleCache.updated();
        }, t, f);
    }
    moveTo(pos, t = 0, f) {
        vec3ToPixelRatio(pos);
        const diff = vec3.create();
        vec3.sub(diff, pos, this.pos);
        return transitionValues((p) => {
            const x = diff[0] * p;
            const y = diff[1] * p;
            const z = diff[2] * p;
            vec3.add(this.pos, this.pos, vector3(x, y, z));
            this.triangleCache.updated();
        }, () => {
            this.pos = pos;
            this.triangleCache.updated();
        }, t, f);
    }
    getTriangleCount() {
        return this.triangleCache.getTriangleCount();
    }
}
export class Plane extends SimulationElement {
    points;
    rotation;
    constructor(pos, points, rotation = vector3(), color) {
        super(pos, color);
        this.points = points;
        this.rotation = rotation;
    }
    setPoints(newPoints) {
        this.points = newPoints;
    }
    rotate(amount, t = 0, f) {
        const initial = vec3.clone(this.rotation);
        return transitionValues((p) => {
            const step = vector3();
            vec3.scale(amount, p, step);
            vec3.add(this.rotation, step, this.rotation);
            this.triangleCache.updated();
        }, () => {
            vec3.add(initial, amount, initial);
            this.rotation = initial;
            this.triangleCache.updated();
        }, t, f);
    }
    rotateTo(angle, t = 0, f) {
        const diff = vector3();
        vec3.sub(angle, this.rotation, diff);
        return transitionValues((p) => {
            const toRotate = vector3();
            vec3.scale(diff, p, toRotate);
            vec3.add(this.rotation, toRotate, this.rotation);
            this.triangleCache.updated();
        }, () => {
            this.rotation = angle;
            this.triangleCache.updated();
        }, t, f);
    }
    getBuffer(_, force) {
        const resBuffer = [];
        if (this.triangleCache.shouldUpdate() || force) {
            const triangles = generateTriangles(this.points).flat();
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
                resBuffer.push(...out, 1, ...vertexColor.toBuffer(), 0, 0);
            });
            this.triangleCache.setCache(resBuffer);
        }
        else {
            return this.triangleCache.getCache();
        }
        return resBuffer;
    }
}
class TriangleCache {
    static BUF_LEN = 10;
    triangles = [];
    hasUpdated = true;
    constructor() { }
    setCache(triangles) {
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
        return this.triangles.length / TriangleCache.BUF_LEN;
    }
}
export class Circle extends SimulationElement {
    radius;
    // private detail = 100;
    constructor(pos, radius, color) {
        super(pos, color);
        this.radius = radius * devicePixelRatio;
    }
    setRadius(num, t = 0, f) {
        num *= devicePixelRatio;
        const diff = num - this.radius;
        return transitionValues((p) => {
            this.radius += diff * p;
            this.triangleCache.updated();
        }, () => {
            this.radius = num;
            this.triangleCache.updated();
        }, t, f);
    }
    scale(amount, t = 0, f) {
        const finalRadius = this.radius * amount;
        const diff = finalRadius - this.radius;
        return transitionValues((p) => {
            this.radius += diff * p;
            this.triangleCache.updated();
        }, () => {
            this.radius = finalRadius;
            this.triangleCache.updated();
        }, t, f);
    }
    getBuffer() {
        // let triangles: Triangles = [];
        // if (this.triangleCache.shouldUpdate()) {
        //   const points: vec3[] = [];
        //   // const rotationInc = (Math.PI * 2) / this.detail;
        //   for (let i = 0; i < this.detail; i++) {
        //     const vec = vec3From(1);
        //     // vec3.rotateZ(vec, vec, vec3.create(), rotationInc * i);
        //     vec3.scale(vec, vec, this.radius);
        //     vec3.add(vec, vec, this.getPos());
        //     points.push(vec);
        //   }
        //   triangles = generateTriangles(points);
        //   this.triangleCache.setCache(triangles);
        // } else {
        //   triangles = this.triangleCache.getCache();
        // }
        // return trianglesAndColorToBuffer(triangles, this.getColor());
        return [];
    }
}
export class Polygon extends SimulationElement {
    points;
    rotation = 0;
    /*
     * points adjusted for device pixel ratio
     */
    constructor(pos, points, color) {
        super(pos, color);
        this.points = points.map((point) => {
            vec3ToPixelRatio(point);
            return point;
        });
    }
    rotate(amount, t = 0, f) {
        const finalRotation = this.rotation + amount;
        return transitionValues((p) => {
            this.rotation += amount * p;
            this.triangleCache.updated();
        }, () => {
            this.rotation = finalRotation;
        }, t, f);
    }
    rotateTo(num, t = 0, f) {
        const diff = num - this.rotation;
        return transitionValues((p) => {
            this.rotation += diff * p;
            this.triangleCache.updated();
        }, () => {
            this.rotation = num;
        }, t, f);
    }
    setPoints(newPoints, t = 0, f) {
        const points = newPoints.map((point) => {
            const vec = vector3(...point);
            vec3ToPixelRatio(vec);
            return vec;
        });
        const lastPoint = this.points.length > 0 ? this.points[this.points.length - 1] : vec3.create();
        if (points.length > this.points.length) {
            while (points.length > this.points.length) {
                this.points.push(vector3(lastPoint[0], lastPoint[1]));
            }
        }
        const initial = this.points.map((p) => vector3(...p));
        const changes = [
            ...points.map((p, i) => {
                const vec = vec3.create();
                vec3.sub(vec, p, this.points[i]);
                return vec;
            }),
            ...this.points.slice(points.length, this.points.length).map((point) => {
                const vec = vector3(...points[points.length - 1]) || vec3.create();
                vec3.sub(vec, vec, point);
                return vec;
            })
        ];
        return transitionValues((p) => {
            this.points = this.points.map((point, i) => {
                const change = vector3(...changes[i]);
                vec3.scale(change, change, p);
                vec3.add(point, point, change);
                return point;
            });
            this.triangleCache.updated();
        }, () => {
            this.points = initial.map((p, i) => {
                const vec = vec3.create();
                vec3.add(vec, p, changes[i]);
                return vec;
            });
            this.points.splice(points.length, this.points.length);
            this.triangleCache.updated();
        }, t, f);
    }
    getBuffer() {
        // let triangles: Triangles = [];
        // if (this.triangleCache.shouldUpdate()) {
        //   let newPoints: vec3[] = this.points.map((vec) => {
        //     const newPoint = vec3.create();
        //     vec3.add(newPoint, vec, this.getPos());
        //     return newPoint;
        //   });
        //   triangles = generateTriangles(newPoints);
        //   this.triangleCache.setCache(triangles);
        // } else {
        //   triangles = this.triangleCache.getCache();
        // }
        // return trianglesAndColorToBuffer(triangles, this.getColor());
        return [];
    }
}
function generateTriangles(vertices) {
    const res = [];
    let facingRight = true;
    let rightOffset = 0;
    let leftOffset = 0;
    while (rightOffset < vertices.length - leftOffset - 2) {
        if (facingRight) {
            const triangle = [
                vertices[rightOffset],
                vertices[rightOffset + 1],
                vertices[vertices.length - leftOffset - 1]
            ];
            res.push(triangle);
            rightOffset++;
        }
        else {
            const triangle = [
                vertices[rightOffset],
                vertices[vertices.length - leftOffset - 1],
                vertices[vertices.length - leftOffset - 2]
            ];
            res.push(triangle);
            leftOffset++;
        }
        facingRight = !facingRight;
    }
    return res;
}
export function vector3(x = 0, y = 0, z = 0) {
    return vec3.fromValues(x, y, z);
}
export function vector2(x = 0, y = 0, z = 0) {
    return vec2.fromValues(x, y, z);
}
export function vec3ToPixelRatio(vec) {
    vec3.mul(vec, vec, vector3(devicePixelRatio, devicePixelRatio, devicePixelRatio));
}
export function randomInt(range, min = 0) {
    return Math.floor(Math.random() * (range - min)) + min;
}
export function randomColor(a = 1) {
    return new Color(randomInt(255), randomInt(255), randomInt(255), a);
}
export function vertex(x, y, z, color) {
    return new Vertex(x, y, z, color);
}
export function color(r, g, b, a) {
    return new Color(r, g, b, a);
}
export function colorf(val, a) {
    return color(val, val, val, a);
}
