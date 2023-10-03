import { vec3, vec4 } from 'gl-matrix';
import { Color, transitionValues } from './simulation';
export class SimulationElement {
    pos;
    color;
    camera = null;
    triangleCache;
    /*
     * position is adjusted for device pixel ratio
     */
    constructor(pos, color = new Color()) {
        this.pos = pos;
        vec3ToPixelRatio(this.pos);
        this.color = color;
        this.triangleCache = new TriangleCache();
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
            vec3.add(this.pos, this.pos, vec3From(x, y, z));
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
            vec3.add(this.pos, this.pos, vec3From(x, y, z));
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
export class Square extends SimulationElement {
    width;
    height;
    rotation;
    constructor(pos, width, height, color, rotation = vec3From()) {
        vec3ToPixelRatio(pos);
        super(pos, color);
        this.width = width * devicePixelRatio;
        this.height = height * devicePixelRatio;
        this.rotation = rotation;
        if (rotation[0] !== 0 || rotation[1] !== 0 || rotation[2] !== 0) {
            this.triangleCache.updated();
        }
    }
    rotate(amount, t = 0, f) {
        const finalRotation = vec3From();
        vec3.add(finalRotation, this.rotation, amount);
        return transitionValues((p) => {
            const toRotate = vec3From();
            vec3.scale(toRotate, amount, p);
            vec3.add(this.rotation, this.rotation, toRotate);
            this.triangleCache.updated();
        }, () => {
            this.rotation = finalRotation;
            this.triangleCache.updated();
        }, t, f);
    }
    rotateTo(angle, t = 0, f) {
        const diff = vec3From();
        vec3.sub(diff, angle, this.rotation);
        return transitionValues((p) => {
            const toRotate = vec3From();
            vec3.scale(toRotate, diff, p);
            vec3.add(this.rotation, this.rotation, toRotate);
            this.triangleCache.updated();
        }, () => {
            this.rotation = angle;
            this.triangleCache.updated();
        }, t, f);
    }
    scaleWidth(amount, t = 0, f) {
        const finalWidth = this.width * amount;
        const diffWidth = finalWidth - this.width;
        return transitionValues((p) => {
            this.width += diffWidth * p;
            this.triangleCache.updated();
        }, () => {
            this.width = finalWidth;
            this.triangleCache.updated();
        }, t, f);
    }
    scaleHeight(amount, t = 0, f) {
        const finalHeight = this.height * amount;
        const diffHeight = finalHeight - this.height;
        return transitionValues((p) => {
            this.height += diffHeight * p;
            this.triangleCache.updated();
        }, () => {
            this.height = finalHeight;
            this.triangleCache.updated();
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
            this.triangleCache.updated();
        }, () => {
            this.width = finalWidth;
            this.height = finalHeight;
            this.triangleCache.updated();
        }, t, f);
    }
    setWidth(num, t = 0, f) {
        num *= devicePixelRatio;
        const diffWidth = num - this.width;
        return transitionValues((p) => {
            this.width += diffWidth * p;
            this.triangleCache.updated();
        }, () => {
            this.width = num;
            this.triangleCache.updated();
        }, t, f);
    }
    setHeight(num, t = 0, f) {
        num *= devicePixelRatio;
        const diffHeight = num - this.height;
        return transitionValues((p) => {
            this.height += diffHeight * p;
            this.triangleCache.updated();
        }, () => {
            this.height = num;
            this.triangleCache.updated();
        }, t, f);
    }
    getBuffer(force) {
        if (!this.camera)
            throw new Error('Expected camera');
        let triangles = [];
        if (this.triangleCache.shouldUpdate() || force) {
            const topLeftPos = vec3From(-this.width / 2, this.height / 2, 0);
            vec3.add(topLeftPos, topLeftPos, this.getPos());
            vec3.rotateZ(topLeftPos, topLeftPos, this.getPos(), this.rotation[2]);
            vec3.rotateY(topLeftPos, topLeftPos, this.getPos(), this.rotation[1]);
            vec3.rotateX(topLeftPos, topLeftPos, this.getPos(), this.rotation[0]);
            // const topLeft = projectPoint(topLeftPos, this.camera, this.rotation, this.getPos());
            const topLeft = projectPointTemp(topLeftPos, this.camera).point;
            const topRightPos = vec3From(this.width / 2, this.height / 2, 0);
            vec3.add(topRightPos, topRightPos, this.getPos());
            vec3.rotateZ(topRightPos, topRightPos, this.getPos(), this.rotation[2]);
            vec3.rotateY(topRightPos, topRightPos, this.getPos(), this.rotation[1]);
            vec3.rotateX(topRightPos, topRightPos, this.getPos(), this.rotation[0]);
            // const topRight = projectPoint(topRightPos, this.camera, this.rotation, this.getPos());
            const topRight = projectPointTemp(topRightPos, this.camera).point;
            const bottomLeftPos = vec3From(-this.width / 2, -this.height / 2, 0);
            vec3.add(bottomLeftPos, bottomLeftPos, this.getPos());
            vec3.rotateZ(bottomLeftPos, bottomLeftPos, this.getPos(), this.rotation[2]);
            vec3.rotateY(bottomLeftPos, bottomLeftPos, this.getPos(), this.rotation[1]);
            vec3.rotateX(bottomLeftPos, bottomLeftPos, this.getPos(), this.rotation[0]);
            // const bottomLeft = projectPoint(bottomLeftPos, this.camera, this.rotation, this.getPos());
            const bottomLeft = projectPointTemp(bottomLeftPos, this.camera).point;
            const bottomRightPos = vec3From(this.width / 2, -this.height / 2, 0);
            vec3.add(bottomRightPos, bottomRightPos, this.getPos());
            vec3.rotateZ(bottomRightPos, bottomRightPos, this.getPos(), this.rotation[2]);
            vec3.rotateY(bottomRightPos, bottomRightPos, this.getPos(), this.rotation[1]);
            vec3.rotateX(bottomRightPos, bottomRightPos, this.getPos(), this.rotation[0]);
            // const bottomRight = projectPoint(bottomRightPos, this.camera, this.rotation, this.getPos());
            const bottomRight = projectPointTemp(bottomRightPos, this.camera).point;
            triangles = generateTriangles([topLeft, topRight, bottomRight, bottomLeft]);
            this.triangleCache.setCache(triangles);
        }
        else {
            triangles = this.triangleCache.getCache();
        }
        return trianglesAndColorToBuffer(triangles, this.getColor());
    }
}
class TriangleCache {
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
        return this.triangles.length;
    }
}
export class Circle extends SimulationElement {
    radius;
    detail = 100;
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
        let triangles = [];
        if (this.triangleCache.shouldUpdate()) {
            const points = [];
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
        }
        else {
            triangles = this.triangleCache.getCache();
        }
        return trianglesAndColorToBuffer(triangles, this.getColor());
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
        return transitionValues((p) => {
            this.points = this.points.map((point, i) => {
                const change = vec3From(...changes[i]);
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
        let triangles = [];
        if (this.triangleCache.shouldUpdate()) {
            let newPoints = this.points.map((vec) => {
                const newPoint = vec3.create();
                vec3.add(newPoint, vec, this.getPos());
                // vec3.rotateZ(newPoint, newPoint, vec3.create(), this.rotation);
                return newPoint;
            });
            triangles = generateTriangles(newPoints);
            this.triangleCache.setCache(triangles);
        }
        else {
            triangles = this.triangleCache.getCache();
        }
        return trianglesAndColorToBuffer(triangles, this.getColor());
    }
}
export class Line extends SimulationElement {
    lineEl;
    constructor(pos1, pos2, thickness = 1, color) {
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
    setLength(length, t = 0, f) {
        return this.lineEl.setWidth(length, t, f);
    }
    scale(amount, t = 0, f) {
        return this.lineEl.scaleWidth(amount, t, f);
    }
    setThickness(num, t = 0, f) {
        return this.lineEl.setHeight(num, t, f);
    }
    getTriangleCount() {
        return this.lineEl.triangleCache.getTriangleCount();
    }
    getBuffer(force) {
        return this.lineEl.getBuffer(force);
    }
}
function trianglesAndColorToBuffer(triangles, color, shape2d = true) {
    const colorBuffer = color.toBuffer();
    let buffer = [];
    triangles.forEach((tri) => {
        tri.forEach((pos) => {
            buffer.push(pos[0], pos[1], shape2d ? 0 : pos[2], ...colorBuffer);
        });
    });
    return new Float32Array(buffer);
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
export function vec4From(x = 0, y = 0, z = 0, w = 1) {
    return vec4.fromValues(x, y, z, w);
}
export function vec3ToPixelRatio(vec) {
    vec3.mul(vec, vec, vec3From(devicePixelRatio, devicePixelRatio, devicePixelRatio));
}
export function vec4ToPixelRatio(vec) {
    vec4.mul(vec, vec, vec4From(devicePixelRatio, devicePixelRatio, devicePixelRatio, 1));
}
export function randomInt(range, min = 0) {
    return Math.floor(Math.random() * (range - min)) + min;
}
export function randomColor(a = 1) {
    return new Color(randomInt(255), randomInt(255), randomInt(255), a);
}
export function projectPointTemp(p, cam) {
    const camRot = cam.getRotation();
    const camPos = cam.getPos();
    const displaySurface = cam.getDisplaySurface();
    const mat1 = [
        [1, 0, 0],
        [0, Math.cos(camRot[0]), Math.sin(camRot[0])],
        [0, -Math.sin(camRot[0]), Math.cos(camRot[0])]
    ];
    const mat2 = [
        [Math.cos(camRot[1]), 0, -Math.sin(camRot[1])],
        [0, 1, 0],
        [Math.sin(camRot[1]), 0, Math.cos(camRot[1])]
    ];
    const mat3 = [
        [Math.cos(camRot[2]), Math.sin(camRot[2]), 0],
        [-Math.sin(camRot[2]), Math.cos(camRot[2]), 0],
        [0, 0, 1]
    ];
    const mat4 = [[p[0] - camPos[0]], [p[1] - camPos[1]], [p[2] - camPos[2]]];
    const matRes1 = [
        [
            mat1[0][0] * mat2[0][0] + mat1[0][1] * mat2[1][0] + mat1[0][2] * mat2[2][0],
            mat1[0][0] * mat2[0][1] + mat1[0][1] * mat2[1][1] + mat1[0][2] * mat2[2][1],
            mat1[0][0] * mat2[0][2] + mat1[0][1] * mat2[1][2] + mat1[0][2] * mat2[2][2]
        ],
        [
            mat1[1][0] * mat2[0][0] + mat1[1][1] * mat2[1][0] + mat1[1][2] * mat2[2][0],
            mat1[1][0] * mat2[0][1] + mat1[1][1] * mat2[1][1] + mat1[1][2] * mat2[2][1],
            mat1[1][0] * mat2[0][2] + mat1[1][1] * mat2[1][2] + mat1[1][2] * mat2[2][2]
        ],
        [
            mat1[2][0] * mat2[0][0] + mat1[2][1] * mat2[1][0] + mat1[2][2] * mat2[2][0],
            mat1[2][0] * mat2[0][1] + mat1[2][1] * mat2[1][1] + mat1[2][2] * mat2[2][1],
            mat1[2][0] * mat2[0][2] + mat1[2][1] * mat2[1][2] + mat1[2][2] * mat2[2][2]
        ]
    ];
    const matRes2 = [
        [
            matRes1[0][0] * mat3[0][0] + matRes1[0][1] * mat3[1][0] + matRes1[0][2] * mat3[2][0],
            matRes1[0][0] * mat3[0][1] + matRes1[0][1] * mat3[1][1] + matRes1[0][2] * mat3[2][1],
            matRes1[0][0] * mat3[0][2] + matRes1[0][1] * mat3[1][2] + matRes1[0][2] * mat3[2][2]
        ],
        [
            matRes1[1][0] * mat3[0][0] + matRes1[1][1] * mat3[1][0] + matRes1[1][2] * mat3[2][0],
            matRes1[1][0] * mat3[0][1] + matRes1[1][1] * mat3[1][1] + matRes1[1][2] * mat3[2][1],
            matRes1[1][0] * mat3[0][2] + matRes1[1][1] * mat3[1][2] + matRes1[1][2] * mat3[2][2]
        ],
        [
            matRes1[2][0] * mat3[0][0] + matRes1[2][1] * mat3[1][0] + matRes1[2][2] * mat3[2][0],
            matRes1[2][0] * mat3[0][1] + matRes1[2][1] * mat3[1][1] + matRes1[2][2] * mat3[2][1],
            matRes1[2][0] * mat3[0][2] + matRes1[2][1] * mat3[1][2] + matRes1[2][2] * mat3[2][2]
        ]
    ];
    const matRes3 = [
        [matRes2[0][0] * mat4[0][0] + matRes2[0][1] * mat4[1][0] + matRes2[0][2] * mat4[2][0]],
        [matRes2[1][0] * mat4[0][0] + matRes2[1][1] * mat4[1][0] + matRes2[1][2] * mat4[2][0]],
        [matRes2[2][0] * mat4[0][0] + matRes2[2][1] * mat4[1][0] + matRes2[2][2] * mat4[2][0]]
    ];
    const d = vec3From(matRes3[0][0], matRes3[1][0], matRes3[2][0]);
    const bx = (displaySurface[2] * d[0]) / d[2] + displaySurface[0];
    const by = (displaySurface[2] * d[1]) / d[2] + displaySurface[1];
    return {
        point: vec3From(bx, by, 0),
        behindCamera: d[2] <= 0
    };
}
