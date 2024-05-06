import { mat4, vec3 } from 'wgpu-matrix';
import { BUF_LEN, colorOffset, drawingInstancesOffset, uvOffset, vertexSize } from './constants.js';
import { color, vector2, vector3 } from './utils.js';
import { SimulationElement } from './graphics.js';
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
export const addObject = (scene, el, id) => {
    if (el instanceof SimulationElement) {
        const obj = new SimSceneObjInfo(el, id);
        scene.unshift(obj);
    }
    else {
        throw logger.error('Cannot add invalid SimulationElement');
    }
};
export const removeObject = (scene, el) => {
    if (!(el instanceof SimulationElement))
        return;
    for (let i = 0; i < scene.length; i++) {
        if (scene[i].getObj() === el) {
            scene.splice(i, 1);
            break;
        }
    }
};
export const removeObjectId = (scene, id) => {
    for (let i = 0; i < scene.length; i++) {
        if (scene[i].getId() === id) {
            scene.splice(i, 1);
            break;
        }
    }
};
export class SimSceneObjInfo {
    obj;
    id;
    lifetime; // ms
    currentLife;
    constructor(obj, id) {
        this.obj = obj;
        this.id = id || null;
        this.lifetime = null;
        this.currentLife = 0;
    }
    /**
     * @param lifetime - ms
     */
    setLifetime(lifetime) {
        this.lifetime = lifetime;
    }
    getLifetime() {
        return this.lifetime;
    }
    lifetimeComplete() {
        if (this.lifetime === null)
            return false;
        return this.currentLife >= this.lifetime;
    }
    /**
     * @param amount - ms
     */
    traverseLife(amount) {
        this.currentLife += amount;
    }
    getObj() {
        return this.obj;
    }
    getId() {
        return this.id;
    }
}
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
class BufferGenerator {
    instancing = false;
    constructor() { }
    setInstancing(state) {
        this.instancing = state;
    }
    generate(x, y, z, color, uv = vector2()) {
        return [x, y, z, 1, ...color.toBuffer(), ...uv, this.instancing ? 1 : 0];
    }
}
export const bufferGenerator = new BufferGenerator();
export function vector3ToPixelRatio(vec) {
    vec[0] *= devicePixelRatio;
    vec[1] *= devicePixelRatio;
    vec[2] *= devicePixelRatio;
}
export function vector2ToPixelRatio(vec) {
    vec[0] *= devicePixelRatio;
    vec[1] *= devicePixelRatio;
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
export function matrixFromRotation(rotation) {
    let rotMatrix = mat4.identity();
    mat4.rotateZ(rotMatrix, rotation[2], rotMatrix);
    mat4.rotateY(rotMatrix, rotation[1], rotMatrix);
    mat4.rotateX(rotMatrix, rotation[0], rotMatrix);
    return rotMatrix;
}
export function rotateMat4(mat, rotation) {
    mat4.rotateZ(mat, rotation[2], mat);
    mat4.rotateY(mat, rotation[1], mat);
    mat4.rotateX(mat, rotation[0], mat);
}
export function createPipeline(device, module, bindGroupLayout, presentationFormat, entryPoint, topology) {
    return device.createRenderPipeline({
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bindGroupLayout]
        }),
        vertex: {
            module,
            entryPoint,
            buffers: [
                {
                    arrayStride: vertexSize,
                    attributes: [
                        {
                            // position
                            shaderLocation: 0,
                            offset: 0,
                            format: 'float32x4'
                        },
                        {
                            // color
                            shaderLocation: 1,
                            offset: colorOffset,
                            format: 'float32x4'
                        },
                        {
                            // size
                            shaderLocation: 2,
                            offset: uvOffset,
                            format: 'float32x2'
                        },
                        {
                            // drawing instances
                            shaderLocation: 3,
                            offset: drawingInstancesOffset,
                            format: 'float32'
                        }
                    ]
                }
            ]
        },
        fragment: {
            module,
            entryPoint: 'fragment_main',
            targets: [
                {
                    format: presentationFormat
                }
            ]
        },
        primitive: {
            topology
        },
        multisample: {
            count: 4
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus'
        }
    });
}
export function triangulateWireFrameOrder(len) {
    const order = Array(len)
        .fill(0)
        .map((_, index) => index);
    let front = 0;
    let back = len - 1;
    while (front < back) {
        order.push(front, back);
        front++;
        back--;
    }
    return order;
}
export function getTotalVertices(scene) {
    let total = 0;
    for (let i = 0; i < scene.length; i++) {
        const obj = scene[i].getObj();
        if (obj.isCollection)
            continue;
        total += obj.getVertexCount();
    }
    return total;
}
