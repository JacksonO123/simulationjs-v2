import { logger } from '../globals.js';
import { BackendType } from '../types.js';
import { defaultWebGLShader } from './webgl.js';
import { defaultWebGPUShader, defaultWebGPUVertexColorShader } from './webgpu.js';

export function getDefaultShaderForBackend(backendType: BackendType) {
    if (backendType === 'webgpu') {
        return defaultWebGPUShader;
    } else if (backendType === 'webgl') {
        return defaultWebGLShader;
    } else {
        throw logger.error('Unknown backend');
    }
}

export function getDefaultVertexColorShaderForBackend(backendType: BackendType) {
    if (backendType === 'webgpu') {
        return defaultWebGPUVertexColorShader;
    } else if (backendType === 'webgl') {
        return defaultWebGLShader;
    } else {
        throw logger.error('Unknown backend');
    }
}
