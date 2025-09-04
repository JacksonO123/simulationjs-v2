/// <reference types="@webgpu/types" />
import { SimulationElement3d, SplinePoint2d } from './graphics.js';
import { FloatArray, LerpFunc, Mat4, Vector2, Vector2m, Vector3, Vector3m, Vector4 } from './types.js';
import { Shader } from './shaders.js';
export declare class Color {
    r: number;
    g: number;
    b: number;
    a: number;
    constructor(r?: number, g?: number, b?: number, a?: number);
    static fromVec4(vec: Vector4): Color;
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
    isTransparent(): boolean;
    setValues(color: Color): void;
}
export declare class Vertex {
    private pos;
    private color;
    private uv;
    constructor(x?: number, y?: number, z?: number, color?: Color, uv?: Vector2);
    getPos(): Vector3;
    setPos(pos: Vector3): void;
    getColor(): Color | null;
    setColor(color: Color): void;
    getUv(): Vector2;
    setUv(uv: Vector2): void;
    setX(x: number): void;
    setY(y: number): void;
    setZ(z: number): void;
    clone(): Vertex;
}
/**
 * @param onFrame - called every frame until the animation is finished
 * @param adjustment - called after animation is finished (called immediately when t = 0) if t > 0 it will only be called if `transformAdjustments` is enabled in settings
 * @param t - animation time (seconds)
 * @returns {Promise<void>}
 */
export declare function transitionValues(onFrame: (deltaT: number, t: number, total: number) => void, adjustment: () => void, transitionLength: number, func?: (n: number) => number): Promise<void>;
type Shift<T extends any[]> = T extends [] ? [] : T extends [unknown, ...infer R] ? R : never;
export declare function frameLoop<T extends (dt: number, ...args: any[]) => any>(cb: T): (...params: Shift<Parameters<T>>) => void;
export declare function clamp(num: number, min: number, max: number): number;
export declare function lerp(a: number, b: number, t: number): number;
export declare function smoothStep(t: number): number;
export declare function linearStep(t: number): number;
export declare function easeInOutExpo(t: number): number;
export declare function easeInOutQuart(t: number): number;
export declare function easeInOutQuad(t: number): number;
export declare function easeInQuad(x: number): number;
export declare function easeOutQuad(x: number): number;
export declare function easeInQuart(x: number): number;
export declare function easeOutQuart(x: number): number;
export declare function easeInExpo(x: number): number;
export declare function easeOutExpo(x: number): number;
export declare function cloneBuf<T extends FloatArray>(buf: T): T;
export declare function vector4(x?: number, y?: number, z?: number, w?: number): Vector4;
export declare function vector3(x?: number, y?: number, z?: number): Vector3;
export declare function vector2(x?: number, y?: number): Vector2;
export declare function matrix4(): Mat4;
export declare function vector3FromVector2(vec: Vector2): Vector3;
export declare function vector2FromVector3(vec: Vector3): Vector2;
export declare function randomInt(max: number, min?: number): number;
export declare function randomColor(a?: number): Color;
export declare function vertex(x?: number, y?: number, z?: number, color?: Color, uv?: Vector2): Vertex;
export declare function color(r?: number, g?: number, b?: number, a?: number): Color;
export declare function colorf(val: number, a?: number): Color;
export declare function splinePoint2d(end: Vertex, control1: Vector2, control2: Vector2, detail?: number): SplinePoint2d;
export declare function continuousSplinePoint2d(end: Vertex, control: Vector2, detail?: number): SplinePoint2d;
/**
 * @param t - seconds
 */
export declare function waitFor(t: number): Promise<unknown>;
export declare function distance2d(vector1: Vector2m, vector2: Vector2m): number;
export declare function distance3d(vector1: Vector3m, vector2: Vector3m): number;
export declare function interpolateColors(colors: Color[], t: number): Color;
export declare function vectorsToVertex(vectors: Vector3[]): Vertex[];
export declare function cloneVectors(vectors: Vector3[]): Vector3[];
export declare function createBindGroup(shader: Shader, bindGroupIndex: number, buffers: GPUBuffer[]): GPUBindGroup;
export declare function writeUniformWorldMatrix(el: SimulationElement3d): void;
export declare function transform(from: SimulationElement3d, to: SimulationElement3d, t: number, f?: LerpFunc): Promise<void>;
export declare function defaultColor(): Color;
export {};
