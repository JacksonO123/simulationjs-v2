import { mat4, vec2, vec3, vec4 } from 'wgpu-matrix';
import { SimulationElement, SplinePoint2d } from './graphics.js';
import { BUF_LEN } from './constants.js';
export class Color {
    r; // 0 - 255
    g; // 0 - 255
    b; // 0 - 255
    a; // 0.0 - 1.0
    constructor(r = 0, g = 0, b = 0, a = 1) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    clone() {
        return new Color(this.r, this.g, this.b, this.a);
    }
    toBuffer() {
        return [this.r / 255, this.g / 255, this.b / 255, this.a];
    }
    toVec4() {
        return vector4(this.r, this.g, this.b, this.a);
    }
    toObject() {
        return {
            r: this.r / 255,
            g: this.g / 255,
            b: this.b / 255,
            a: this.a
        };
    }
    diff(color) {
        return new Color(this.r - color.r, this.g - color.g, this.b - color.b, this.a - color.a);
    }
}
export class VertexCache {
    vertices = [];
    hasUpdated = true;
    constructor() { }
    setCache(vertices) {
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
    pos;
    color;
    is3d;
    uv;
    constructor(x = 0, y = 0, z = 0, color, is3dPoint = true, uv = vector2()) {
        this.pos = vector3(x, y, z);
        this.color = color ? color : null;
        this.is3d = is3dPoint;
        this.uv = uv;
    }
    getPos() {
        return this.pos;
    }
    setPos(pos) {
        this.pos = pos;
    }
    getColor() {
        return this.color;
    }
    setColor(color) {
        this.color = color;
    }
    getUv() {
        return this.uv;
    }
    setUv(uv) {
        this.uv = uv;
    }
    setX(x) {
        this.pos[0] = x;
    }
    setY(y) {
        this.pos[1] = y;
    }
    setZ(z) {
        this.pos[2] = z;
    }
    setIs3d(is3d) {
        this.is3d = is3d;
    }
    clone() {
        return new Vertex(this.pos[0], this.pos[1], this.pos[2], this.color?.clone(), this.is3d, cloneBuf(this.uv));
    }
    toBuffer(defaultColor) {
        if (this.is3d)
            return vertexBuffer3d(this.pos[0], this.pos[1], this.pos[2], this.color || defaultColor, this.uv);
        else
            return vertexBuffer2d(this.pos[0], this.pos[1], this.color || defaultColor, this.uv);
    }
}
export const buildProjectionMatrix = (aspectRatio, zNear = 1, zFar = 500) => {
    const fov = (2 * Math.PI) / 5;
    return mat4.perspective(fov, aspectRatio, zNear, zFar);
};
export const getTransformationMatrix = (pos, rotation, projectionMatrix) => {
    const modelViewProjectionMatrix = mat4.create();
    const viewMatrix = mat4.identity();
    const camPos = vector3();
    vec3.clone(pos, camPos);
    vec3.scale(camPos, -1, camPos);
    mat4.rotateZ(viewMatrix, rotation[2], viewMatrix);
    mat4.rotateY(viewMatrix, rotation[1], viewMatrix);
    mat4.rotateX(viewMatrix, rotation[0], viewMatrix);
    mat4.translate(viewMatrix, camPos, viewMatrix);
    mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix);
    return modelViewProjectionMatrix;
};
export const getOrthoMatrix = (screenSize) => {
    return mat4.ortho(0, screenSize[0], 0, screenSize[1], 0, 100);
};
export const buildDepthTexture = (device, width, height) => {
    return device.createTexture({
        size: [width, height],
        format: 'depth24plus',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        sampleCount: 4
    });
};
export const buildMultisampleTexture = (device, ctx, width, height) => {
    return device.createTexture({
        size: [width, height],
        format: ctx.getCurrentTexture().format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        sampleCount: 4
    });
};
export const applyElementToScene = (scene, camera, el) => {
    if (!camera)
        throw logger.error('Camera is not initialized in element');
    if (el instanceof SimulationElement) {
        el.setCamera(camera);
        scene.push(el);
    }
    else {
        throw logger.error('Cannot add invalid SimulationElement');
    }
};
class Logger {
    constructor() { }
    fmt(msg) {
        return `SimJS: ${msg}`;
    }
    log(msg) {
        console.log(this.fmt(msg));
    }
    error(msg) {
        return new Error(this.fmt(msg));
    }
    warn(msg) {
        console.warn(this.fmt(msg));
    }
    log_error(msg) {
        console.error(this.fmt(msg));
    }
}
export const logger = new Logger();
// optomized for speed, depending on orientation of vertices as input, shape may not be preserved
export function lossyTriangulate(vertices) {
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
/**
 * @param callback1 - called every frame until the animation is finished
 * @param callback2 - called after animation is finished (called immediately when t = 0)
 * @param t - animation time (seconds)
 * @returns {Promise<void>}
 */
export function transitionValues(callback1, callback2, transitionLength, func) {
    return new Promise((resolve) => {
        if (transitionLength == 0) {
            callback2();
            resolve();
        }
        else {
            let prevPercent = 0;
            let prevTime = Date.now();
            const step = (t, f) => {
                const newT = f(t);
                callback1(newT - prevPercent, t);
                prevPercent = newT;
                const now = Date.now();
                let diff = now - prevTime;
                diff = diff === 0 ? 1 : diff;
                const fpsScale = 1 / diff;
                const inc = 1 / (1000 * fpsScale * transitionLength);
                prevTime = now;
                if (t < 1) {
                    window.requestAnimationFrame(() => step(t + inc, f));
                }
                else {
                    callback2();
                    resolve();
                }
            };
            step(0, func ? func : linearStep);
        }
    });
}
export function lerp(a, b, t) {
    return a + (b - a) * t;
}
export function smoothStep(t) {
    const v1 = t * t;
    const v2 = 1 - (1 - t) * (1 - t);
    return lerp(v1, v2, t);
}
export function linearStep(t) {
    return t;
}
export function easeInOutExpo(t) {
    return t === 0
        ? 0
        : t === 1
            ? 1
            : t < 0.5
                ? Math.pow(2, 20 * t - 10) / 2
                : (2 - Math.pow(2, -20 * t + 10)) / 2;
}
export function easeInOutQuart(t) {
    return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}
export function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
export function vertexBuffer3d(x, y, z, color, uv = vector2()) {
    return [x, y, z, 1, ...color.toBuffer(), ...uv, 1];
}
export function vertexBuffer2d(x, y, color, uv = vector2()) {
    return [x, y, 0, 1, ...color.toBuffer(), ...uv, 0];
}
export function vec3ToPixelRatio(vec) {
    vec3.mul(vec, vector3(devicePixelRatio, devicePixelRatio, devicePixelRatio), vec);
}
export function cloneBuf(buf) {
    return new Float32Array(buf);
}
export function vector4(x = 0, y = 0, z = 0, w = 0) {
    return vec4.fromValues(x, y, z, w);
}
export function vector3(x = 0, y = 0, z = 0) {
    return vec3.fromValues(x, y, z);
}
export function vector2(x = 0, y = 0) {
    return vec2.fromValues(x, y);
}
export function vector3FromVector2(vec) {
    return vector3(vec[0], vec[1]);
}
export function vector2FromVector3(vec) {
    return vector2(vec[0], vec[1]);
}
export function colorFromVector4(vec) {
    return new Color(vec[0], vec[1], vec[2], vec[3]);
}
export function randomInt(range, min = 0) {
    return Math.floor(Math.random() * (range - min)) + min;
}
export function randomColor(a = 1) {
    return new Color(randomInt(255), randomInt(255), randomInt(255), a);
}
export function vertex(x, y, z, color, is3dPoint, uv) {
    return new Vertex(x, y, z, color, is3dPoint, uv);
}
export function color(r, g, b, a) {
    return new Color(r, g, b, a);
}
export function colorf(val, a) {
    return color(val, val, val, a);
}
export function splinePoint2d(end, control1, control2, detail) {
    vec2.scale(control1, devicePixelRatio, control1);
    vec2.scale(control2, devicePixelRatio, control2);
    vec2.scale(end.getPos(), devicePixelRatio, end.getPos());
    const rawControls = [cloneBuf(control1), cloneBuf(control2)];
    vec2.add(end.getPos(), control2, control2);
    return new SplinePoint2d(null, end, control1, control2, rawControls, detail);
}
export function continuousSplinePoint2d(end, control, detail) {
    vec2.scale(control, devicePixelRatio, control);
    vec2.scale(end.getPos(), devicePixelRatio, end.getPos());
    const rawControls = [vector2(), cloneBuf(control)];
    vec2.add(end.getPos(), control, control);
    return new SplinePoint2d(null, end, null, control, rawControls, detail);
}
export function interpolateColors(colors, t) {
    t = Math.min(1, Math.max(0, t));
    if (colors.length === 0)
        return color();
    if (colors.length === 1)
        return colors[0];
    const colorInterval = 1 / colors.length;
    let index = Math.floor(t / colorInterval);
    if (index === -1)
        console.log(t);
    if (index >= colors.length)
        index = colors.length - 1;
    const from = index === colors.length - 1 ? colors[index - 1] : colors[index];
    const to = index === colors.length - 1 ? colors[index] : colors[index + 1];
    const diff = to.diff(from);
    const scale = t / (colorInterval * colors.length);
    diff.r *= scale;
    diff.g *= scale;
    diff.b *= scale;
    diff.a *= scale;
    const res = from.clone();
    res.r += diff.r;
    res.g += diff.g;
    res.b += diff.b;
    res.a += diff.a;
    return res;
}
