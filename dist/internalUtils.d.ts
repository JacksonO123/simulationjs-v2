/// <reference types="@webgpu/types" />
import { VertexParamGeneratorInfo, Mat4, Vector2, Vector3, VertexParamInfo } from './types.js';
import { Color } from './utils.js';
import { SimulationElement3d } from './graphics.js';
export declare class VertexCache {
    private vertices;
    private hasUpdated;
    constructor();
    setCache(vertices: Float32Array | number[]): void;
    getCache(): Float32Array;
    updated(): void;
    shouldUpdate(): boolean;
    getVertexCount(): number;
}
export declare const updateProjectionMatrix: (mat: Mat4, aspectRatio: number, zNear?: number, zFar?: number) => any;
export declare const updateWorldProjectionMatrix: (worldProjMat: Mat4, projMat: Mat4) => void;
export declare const updateOrthoProjectionMatrix: (mat: Mat4, screenSize: [number, number]) => Float32Array;
export declare const buildDepthTexture: (device: GPUDevice, width: number, height: number) => GPUTexture;
export declare const buildMultisampleTexture: (device: GPUDevice, ctx: GPUCanvasContext, width: number, height: number) => GPUTexture;
export declare const removeObjectId: (scene: SimSceneObjInfo[], id: string) => void;
export declare class SimSceneObjInfo {
    private obj;
    private id;
    private lifetime;
    private currentLife;
    constructor(obj: SimulationElement3d, id?: string);
    /**
     * @param lifetime - ms
     */
    setLifetime(lifetime: number): void;
    getLifetime(): number | null;
    lifetimeComplete(): boolean;
    /**
     * @param amount - ms
     */
    traverseLife(amount: number): void;
    getObj(): SimulationElement3d;
    getId(): string | null;
}
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
export declare function lossyTriangulateStrip<T>(vertices: T[]): T[];
declare class BufferGenerator {
    private instancing;
    constructor();
    setInstancing(state: boolean): void;
    generate(x: number, y: number, z: number, color: Color, uv?: Vector2, vertexParamGenerator?: VertexParamGeneratorInfo): number[];
}
export declare const bufferGenerator: BufferGenerator;
export declare function vector3ToPixelRatio(vec: Vector3): void;
export declare function vector2ToPixelRatio(vec: Vector2): void;
export declare function matrixFromRotation(rotation: Vector3): Mat4;
export declare function rotateMat4(mat: Mat4, rotation: Vector3): void;
export declare function createPipeline(device: GPUDevice, module: GPUShaderModule, bindGroupLayouts: GPUBindGroupLayout[], presentationFormat: GPUTextureFormat, topology: GPUPrimitiveTopology, vertexParams?: VertexParamInfo[]): GPURenderPipeline;
export declare function triangulateWireFrameOrder(len: number): number[];
export declare function getTotalVertices(scene: SimSceneObjInfo[]): number;
export declare function vectorCompAngle(a: number, b: number): number;
export declare function angleBetween(pos1: Vector3, pos2: Vector3): Vector3;
export declare function internalTransitionValues(onFrame: (deltaT: number, t: number, total: number) => void, adjustment: () => void, transitionLength: number, func?: (n: number) => number): Promise<void>;
export declare function posTo2dScreen(pos: Vector3): Vector3;
export {};
