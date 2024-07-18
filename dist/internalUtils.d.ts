/// <reference types="@webgpu/types" />
import { AnySimulationElement, BufferExtenderInfo, Mat4, Vector2, Vector3, VertexParamInfo } from './types.js';
import { Color } from './utils.js';
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
export declare const addObject: (scene: SimSceneObjInfo[], el: AnySimulationElement, device: GPUDevice | null, id?: string) => void;
export declare const removeObject: (scene: SimSceneObjInfo[], el: AnySimulationElement) => void;
export declare const removeObjectId: (scene: SimSceneObjInfo[], id: string) => void;
export declare class SimSceneObjInfo {
    private obj;
    private id;
    private lifetime;
    private currentLife;
    constructor(obj: AnySimulationElement, id?: string);
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
    getObj(): AnySimulationElement;
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
declare class BufferGenerator {
    private instancing;
    constructor();
    setInstancing(state: boolean): void;
    generate(x: number, y: number, z: number, color: Color, uv?: Vector2, bufferExtender?: BufferExtenderInfo): number[];
}
export declare const bufferGenerator: BufferGenerator;
export declare function vector3ToPixelRatio(vec: Vector3): void;
export declare function vector2ToPixelRatio(vec: Vector2): void;
export declare function matrixFromRotation(rotation: Vector3): Mat4;
export declare function rotateMat4(mat: Mat4, rotation: Vector3): void;
export declare function createPipeline(device: GPUDevice, module: GPUShaderModule, bindGroupLayout: GPUBindGroupLayout, presentationFormat: GPUTextureFormat, entryPoint: string, topology: GPUPrimitiveTopology, vertexParams?: VertexParamInfo[]): GPURenderPipeline;
export declare function triangulateWireFrameOrder(len: number): number[];
export declare function getTotalVertices(scene: SimSceneObjInfo[]): number;
export {};
