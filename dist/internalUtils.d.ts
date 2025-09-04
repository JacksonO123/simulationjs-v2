/// <reference types="@webgpu/types" />
import { Mat4, Vector3 } from './types.js';
import { Shader } from './shaders.js';
import { SimulationElement3d } from './graphics.js';
export declare class Float32ArrayCache {
    private vertices;
    private hasUpdated;
    constructor();
    setCache(vertices: Float32Array | number[]): void;
    getCache(): Float32Array;
    updated(): void;
    shouldUpdate(): boolean;
    getVertexCount(stride?: number): number;
}
export declare class CachedArray<T> {
    length: number;
    private data;
    constructor();
    add(index: T): void;
    reset(): void;
    clearCache(): void;
    getArray(): T[];
}
export declare const updateProjectionMatrix: (mat: Mat4, aspectRatio: number, zNear?: number, zFar?: number) => any;
export declare const updateWorldProjectionMatrix: (worldProjMat: Mat4, projMat: Mat4) => void;
export declare const updateOrthoProjectionMatrix: (mat: Mat4, screenSize: [number, number]) => Float32Array;
export declare const buildDepthTexture: (device: GPUDevice, width: number, height: number) => GPUTexture;
export declare const buildMultisampleTexture: (device: GPUDevice, ctx: GPUCanvasContext, width: number, height: number) => GPUTexture;
export declare function lossyTriangulate<T>(vertices: T[]): (readonly [T, T, T])[];
export declare function lossyTriangulateStrip<T>(vertices: T[]): T[];
export declare function createIndexArray(length: number): number[];
export declare function triangulateWireFrameOrder(len: number): number[];
export declare function getVertexAndIndexSize(scene: SimulationElement3d[]): readonly [number, number];
export declare function internalTransitionValues(onFrame: (deltaT: number, t: number, total: number) => void, adjustment: () => void, transitionLength: number, func?: (n: number) => number): Promise<void>;
export declare function posTo2dScreen(pos: Vector3): Vector3;
export declare function createPipeline(device: GPUDevice, info: string, shader: Shader): GPURenderPipeline;
export declare function addToScene(scene: SimulationElement3d[], el: SimulationElement3d, id?: string): void;
export declare function removeSceneObj(scene: SimulationElement3d[], el: SimulationElement3d): void;
export declare function removeSceneId(scene: SimulationElement3d[], id: string): void;
