import { mat4, vec3 } from 'wgpu-matrix';
import { BUF_LEN, colorOffset, drawingInstancesOffset, uvOffset, vertexSize } from './constants.js';
import { cloneBuf, vector2 } from './utils.js';
import { SimulationElement } from './graphics.js';
import { SceneCollection } from './simulation.js';
export class VertexCache {
    vertices;
    hasUpdated = true;
    constructor() {
        this.vertices = new Float32Array();
    }
    setCache(vertices) {
        this.vertices = Array.isArray(vertices) ? new Float32Array(vertices) : vertices;
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
export const updateProjectionMatrix = (mat, aspectRatio, zNear = 1, zFar = 500) => {
    const fov = (2 * Math.PI) / 5;
    return mat4.perspective(fov, aspectRatio, zNear, zFar, mat);
};
export const updateWorldProjectionMatrix = (worldProjMat, projMat, camera) => {
    mat4.identity(worldProjMat);
    const camPos = cloneBuf(camera.getPos());
    const rotation = camera.getRotation();
    vec3.scale(camPos, -1, camPos);
    mat4.rotateZ(worldProjMat, rotation[2], worldProjMat);
    mat4.rotateY(worldProjMat, rotation[1], worldProjMat);
    mat4.rotateX(worldProjMat, rotation[0], worldProjMat);
    mat4.translate(worldProjMat, camPos, worldProjMat);
    mat4.multiply(projMat, worldProjMat, worldProjMat);
};
export const updateOrthoProjectionMatrix = (mat, screenSize) => {
    return mat4.ortho(0, screenSize[0], 0, screenSize[1], 0, 100, mat);
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
export const addObject = (scene, el, device, id) => {
    if (el instanceof SimulationElement) {
        if (device !== null && el instanceof SceneCollection) {
            el.setDevice(device);
        }
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
export function lossyTriangulateStrip(vertices) {
    const res = [];
    let upper = vertices.length - 1;
    let lower = 0;
    let onLower = true;
    while (upper > lower) {
        if (onLower) {
            res.push(vertices[lower]);
            lower++;
        }
        else {
            res.push(vertices[upper]);
            upper--;
        }
        onLower = !onLower;
    }
    res.push(vertices[upper]);
    return res;
}
class BufferGenerator {
    instancing = false;
    constructor() { }
    setInstancing(state) {
        this.instancing = state;
    }
    generate(x, y, z, color, uv = vector2(), vertexParamGenerator) {
        if (vertexParamGenerator) {
            const buf = vertexParamGenerator.createBuffer(x, y, z, color);
            if (buf.length !== vertexParamGenerator.bufferSize) {
                logger.log_error(`Vertex size for shader group does not match buffer extension size (${buf.length} to expected ${vertexParamGenerator.bufferSize})`);
                return [];
            }
            return buf;
        }
        return [x, y, z, ...color.toBuffer(), ...uv, this.instancing ? 1 : 0];
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
export function matrixFromRotation(rotation) {
    const rotMatrix = mat4.identity();
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
export function createPipeline(device, module, bindGroupLayouts, presentationFormat, topology, vertexParams) {
    let params = [
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
    ];
    let stride = vertexSize;
    if (vertexParams) {
        params = [];
        let offset = 0;
        for (let i = 0; i < vertexParams.length; i++) {
            params.push({
                shaderLocation: i,
                offset,
                format: vertexParams[i].format
            });
            offset += vertexParams[i].size;
        }
        stride = offset;
    }
    return device.createRenderPipeline({
        layout: device.createPipelineLayout({
            bindGroupLayouts: bindGroupLayouts
        }),
        vertex: {
            module,
            entryPoint: 'vertex_main',
            buffers: [
                {
                    arrayStride: stride,
                    attributes: params
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
        total += obj.getVertexCount();
    }
    return total;
}
export function wrapVoidPromise(promise) {
    return new Promise((resolve) => {
        promise.then(() => resolve());
    });
}
// export function vec3FromQuat(vec: Vector3, quat: Quat, matrix: Mat4) {
//   const mat = matrix || matrix4();
//   const threshold = 0.9999999;
//   mat4.fromQuat(quat, mat);
//   vec[1] = clamp(mat[8], -1, 1);
//   if (Math.abs(mat[8]) < threshold) {
//     vec[0] = Math.atan2(-mat[9], mat[10]);
//     vec[2] = Math.atan2(-mat[4], mat[0]);
//   } else {
//     vec[0] = Math.atan2(-mat[6], mat[5]);
//     vec[2] = 0;
//   }
// }
