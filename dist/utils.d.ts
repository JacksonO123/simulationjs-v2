/// <reference types="dist" />
import { SimulationElement, SplinePoint2d } from './graphics.js';
import { FloatArray, Mat4, Vector2, Vector3, Vector4 } from './types.js';
export declare class Color {
    r: number;
    g: number;
    b: number;
    a: number;
    constructor(r?: number, g?: number, b?: number, a?: number);
    clone(): Color;
    toBuffer(): readonly [number, number, number, number];
    toVec4(): Vector4;
    toObject(): {
        r: number;
        g: number;
        b: number;
        a: number;
    };
    diff(color: Color): Color;
}
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
export declare class Vertex {
    private pos;
    private color;
    private is3d;
    private uv;
    constructor(x?: number, y?: number, z?: number, color?: Color, is3dPoint?: boolean, uv?: Vector2);
    getPos(): Vector3;
    setPos(pos: Vector3): void;
    getColor(): Color | null;
    setColor(color: Color): void;
    getUv(): Vector2;
    setUv(uv: Vector2): void;
    setX(x: number): void;
    setY(y: number): void;
    setZ(z: number): void;
    setIs3d(is3d: boolean): void;
    clone(): Vertex;
    toBuffer(defaultColor: Color): number[];
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
/**
 * @param callback1 - called every frame until the animation is finished
 * @param callback2 - called after animation is finished (called immediately when t = 0)
 * @param t - animation time (seconds)
 * @returns {Promise<void>}
 */
export declare function transitionValues(callback1: (deltaT: number, t: number) => void, callback2: () => void, transitionLength: number, func?: (n: number) => number): Promise<void>;
export declare function lerp(a: number, b: number, t: number): number;
export declare function smoothStep(t: number): number;
export declare function linearStep(t: number): number;
export declare function easeInOutExpo(t: number): number;
export declare function easeInOutQuart(t: number): number;
export declare function easeInOutQuad(t: number): number;
declare class BufferGenerator {
    private instancing;
    constructor();
    setInstancing(state: boolean): void;
    generate(x: number, y: number, z: number, color: Color, uv?: Vector2): number[];
}
export declare const bufferGenerator: BufferGenerator;
export declare function vector3ToPixelRatio(vec: Vector3): void;
export declare function vector2ToPixelRatio(vec: Vector2): void;
export declare function cloneBuf<T extends FloatArray>(buf: T): T;
export declare function vector4(x?: number, y?: number, z?: number, w?: number): Vector4;
export declare function vector3(x?: number, y?: number, z?: number): Vector3;
export declare function vector2(x?: number, y?: number): Vector2;
export declare function matrix4(): Mat4;
export declare function vector3FromVector2(vec: Vector2): Vector3;
export declare function vector2FromVector3(vec: Vector3): Vector2;
export declare function colorFromVector4(vec: Vector4): Color;
export declare function randomInt(range: number, min?: number): number;
export declare function randomColor(a?: number): Color;
export declare function vertex(x?: number, y?: number, z?: number, color?: Color, is3dPoint?: boolean, uv?: Vector2): Vertex;
export declare function color(r?: number, g?: number, b?: number, a?: number): Color;
export declare function colorf(val: number, a?: number): Color;
export declare function splinePoint2d(end: Vertex, control1: Vector2, control2: Vector2, detail?: number): SplinePoint2d;
export declare function continuousSplinePoint2d(end: Vertex, control: Vector2, detail?: number): SplinePoint2d;
export declare function interpolateColors(colors: Color[], t: number): Color;
/**
 * @param t - seconds
 */
export declare function waitFor(t: number): Promise<unknown>;
export declare function matrixFromRotation(rotation: Vector3): Mat4;
export declare function rotateMat4(mat: Mat4, rotation: Vector3): void;
export declare function createPipeline(device: GPUDevice, module: GPUShaderModule, bindGroupLayout: GPUBindGroupLayout, presentationFormat: GPUTextureFormat, entryPoint: string, topology: GPUPrimitiveTopology): GPURenderPipeline;
export declare function triangulateWireFrameOrder(len: number): number[];
export declare function getTotalVertices(scene: SimulationElement[]): number;
export {};
