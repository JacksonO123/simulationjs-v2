import { mat4, vec3 } from 'wgpu-matrix';
import { SimulationElement, vector3 } from './graphics.js';
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
        usage: GPUTextureUsage.RENDER_ATTACHMENT
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
