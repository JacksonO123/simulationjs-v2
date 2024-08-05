import { mat4, vec2, vec3, vec4 } from 'wgpu-matrix';
import { SplinePoint2d } from './graphics.js';
import { SimSceneObjInfo, bufferGenerator } from './internalUtils.js';
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
export class Vertex {
    pos;
    color;
    is3d;
    uv;
    constructor(x = 0, y = 0, z = 0, color, is3dPoint = true, uv = vector2()) {
        this.pos = vector3(x, y, z);
        this.color = color || null;
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
            return bufferGenerator.generate(this.pos[0], this.pos[1], this.pos[2], this.color || defaultColor, this.uv);
        else
            return bufferGenerator.generate(this.pos[0], this.pos[1], 0, this.color || defaultColor, this.uv);
    }
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
                const deltaT = newT - prevPercent;
                callback1(deltaT, t);
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function frameLoop(cb) {
    let prevFrame = 0;
    let prevTime = 0;
    function start(dt, ...args) {
        let res = cb(dt, ...args);
        if (res === false) {
            window.cancelAnimationFrame(prevFrame);
            return;
        }
        if (!Array.isArray(res))
            res = args;
        const now = Date.now();
        const diff = now - prevTime;
        prevTime = now;
        prevFrame = window.requestAnimationFrame(() => start(diff, ...res));
    }
    return (...p) => {
        prevTime = Date.now();
        start(0, ...p);
    };
}
export function clamp(num, min, max) {
    return Math.min(max, Math.max(min, num));
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
export function easeInQuad(x) {
    return x * x;
}
export function easeOutQuad(x) {
    return 1 - (1 - x) * (1 - x);
}
export function easeInQuart(x) {
    return x * x * x * x;
}
export function easeOutQuart(x) {
    return 1 - Math.pow(1 - x, 4);
}
export function easeInExpo(x) {
    return x === 0 ? 0 : Math.pow(2, 10 * x - 10);
}
export function easeOutExpo(x) {
    return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
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
export function matrix4() {
    return mat4.identity();
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
/**
 * @param t - seconds
 */
export function waitFor(t) {
    return new Promise((resolve) => {
        setTimeout(resolve, t * 1000);
    });
}
export function distance2d(vector1, vector2) {
    return vec2.distance(vector1, vector2);
}
export function distance3d(vector1, vector2) {
    return vec3.distance(vector1, vector2);
}
export function toSceneObjInfo(el, id) {
    return new SimSceneObjInfo(el, id);
}
export function toSceneObjInfoMany(el, id) {
    return el.map((item, index) => toSceneObjInfo(item, id ? id[index] : undefined));
}
export function interpolateColors(colors, t) {
    t = Math.min(1, Math.max(0, t));
    if (colors.length === 0)
        return color();
    if (colors.length === 1)
        return colors[0];
    const colorInterval = 1 / colors.length;
    let index = Math.floor(t / colorInterval);
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
