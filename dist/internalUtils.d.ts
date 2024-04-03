/// <reference types="dist" />
import { Mat4, Vector2, Vector3 } from './types.js';
import { Color } from './utils.js';
import { SimulationElement } from './graphics.js';
export declare class VertexCache {
    private vertices;
    private hasUpdated;
    constructor();
    setCache(vertices: number[]): void;
    getCache(): number[];
    updated(): void;
    shouldUpdate(): boolean;
    getVertexCount(): number;
}
export declare const buildProjectionMatrix: (aspectRatio: number, zNear?: number, zFar?: number) => any;
export declare const getTransformationMatrix: (pos: Vector3, rotation: Vector3, projectionMatrix: mat4) => Float32Array;
export declare const getOrthoMatrix: (screenSize: [number, number]) => Float32Array;
export declare const buildDepthTexture: (device: GPUDevice, width: number, height: number) => GPUTexture;
export declare const buildMultisampleTexture: (device: GPUDevice, ctx: GPUCanvasContext, width: number, height: number) => GPUTexture;
export declare const applyElementToScene: (scene: SimulationElement[], el: SimulationElement) => void;
declare class Logger {
    constructor();
    private fmt;
    log(msg: string): void;
    error(msg: string): Error;
    warn(msg: string): void;
    log_error(msg: string): void;
}
export declare const logger: Logger;
export declare function lossyTriangulate<T>(vertices: T[]): (readonly [T, T, T])[];
declare class BufferGenerator {
    private instancing;
    constructor();
    setInstancing(state: boolean): void;
    generate(x: number, y: number, z: number, color: Color, uv?: Vector2): number[];
}
export declare const bufferGenerator: BufferGenerator;
export declare function vector3ToPixelRatio(vec: Vector3): void;
export declare function vector2ToPixelRatio(vec: Vector2): void;
export declare function interpolateColors(colors: Color[], t: number): Color;
export declare function matrixFromRotation(rotation: Vector3): Mat4;
export declare function rotateMat4(mat: Mat4, rotation: Vector3): void;
export declare function createPipeline(device: GPUDevice, module: GPUShaderModule, bindGroupLayout: GPUBindGroupLayout, presentationFormat: GPUTextureFormat, entryPoint: string, topology: GPUPrimitiveTopology): GPURenderPipeline;
export declare function triangulateWireFrameOrder(len: number): number[];
export declare function getTotalVertices(scene: SimulationElement[]): number;
export {};
