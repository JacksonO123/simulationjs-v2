import { mat4, vec3 } from 'wgpu-matrix';
import { cloneBuf, transitionValues } from './utils.js';
import { camera } from './simulation.js';
import { settings } from './settings.js';
import { SimulationElement3d } from './graphics.js';
import { logger } from './globals.js';
export class Float32ArrayCache {
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
    getVertexCount(stride = 1) {
        return this.vertices.length / stride;
    }
}
export class CachedArray {
    length;
    data;
    constructor() {
        this.length = 0;
        this.data = [];
    }
    add(index) {
        if (this.length < this.data.length) {
            this.data[this.length] = index;
        }
        else {
            this.data.push(index);
        }
        this.length++;
    }
    reset() {
        this.length = 0;
    }
    clearCache() {
        this.reset();
        this.data = [];
    }
    getArray() {
        return this.data;
    }
}
export const updateProjectionMatrix = (mat, aspectRatio, zNear = 1, zFar = 500) => {
    const fov = Math.PI / 4;
    return mat4.perspective(fov, aspectRatio, zNear, zFar, mat);
};
export const updateWorldProjectionMatrix = (worldProjMat, projMat) => {
    mat4.identity(worldProjMat);
    const camPos = cloneBuf(camera.getPos());
    const rotation = camera.getRotation();
    vec3.negate(camPos, camPos);
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
export function createIndexArray(length) {
    return Array(length)
        .fill(0)
        .map((_, index) => index);
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
export function getVertexAndIndexSize(scene) {
    let vertexSize = 0;
    let indexSize = 0;
    for (let i = 0; i < scene.length; i++) {
        const obj = scene[i];
        vertexSize += obj.getTreeVertexCount() * obj.getShader().getBufferLength();
        indexSize += obj.getIndexCount();
    }
    return [vertexSize, indexSize];
}
export function internalTransitionValues(onFrame, adjustment, transitionLength, func) {
    const newAdjustment = () => {
        if (settings.transformAdjustments)
            adjustment();
    };
    return transitionValues(onFrame, newAdjustment, transitionLength, func);
}
export function posTo2dScreen(pos) {
    const newPos = cloneBuf(pos);
    newPos[1] = camera.getScreenSize()[1] + newPos[1];
    return newPos;
}
export function createPipeline(device, info, shader) {
    const shaderModule = shader.getModule();
    const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    const infoObj = JSON.parse(info);
    return device.createRenderPipeline({
        layout: device.createPipelineLayout({
            bindGroupLayouts: shader.getBindGroupLayouts()
        }),
        vertex: {
            module: shaderModule,
            entryPoint: shader.getVertexMain(),
            buffers: [shader.getVertexBuffers()]
        },
        fragment: {
            module: shaderModule,
            entryPoint: 'fragment_main',
            targets: [
                {
                    format: presentationFormat,
                    blend: {
                        color: {
                            srcFactor: 'src-alpha',
                            dstFactor: 'one-minus-src-alpha'
                        },
                        alpha: {
                            srcFactor: 'src-alpha',
                            dstFactor: 'one-minus-src-alpha'
                        }
                    }
                }
            ]
        },
        primitive: {
            topology: infoObj.topology,
            stripIndexFormat: infoObj.topology.endsWith('strip') ? 'uint32' : undefined,
            cullMode: infoObj.cullMode
        },
        multisample: {
            count: 4
        },
        depthStencil: {
            depthWriteEnabled: !infoObj.transparent,
            depthCompare: 'less',
            format: 'depth24plus'
        }
    });
}
export function addToScene(scene, el, id) {
    if (el instanceof SimulationElement3d) {
        if (id)
            el.setId(id);
        scene.unshift(el);
    }
    else {
        throw logger.error('Cannot add invalid SimulationElement');
    }
}
export function removeSceneObj(scene, el) {
    for (let i = 0; i < scene.length; i++) {
        if (scene[i] === el) {
            scene.splice(i, 1);
            break;
        }
    }
}
export function removeSceneId(scene, id) {
    for (let i = 0; i < scene.length; i++) {
        if (scene[i].getId() === id) {
            scene.splice(i, 1);
            break;
        }
    }
}
